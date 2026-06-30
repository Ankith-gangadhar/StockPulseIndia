from datetime import datetime, timezone
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import yfinance as yf
from ta.momentum import RSIIndicator
from ta.trend import MACD

app = FastAPI(title="StockPulse Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
NIFTY_50 = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "KOTAKBANK", "SBIN", "BHARTIARTL", "ITC",
    "ASIANPAINT", "AXISBANK", "MARUTI", "WIPRO", "LT", "SUNPHARMA", "ULTRACEMCO", "TITAN", "BAJFINANCE",
    "NESTLEIND", "POWERGRID", "NTPC", "TECHM", "HINDUNILVR", "ADANIPORTS", "COALINDIA", "ONGC", "TATAMOTORS",
    "TATASTEEL", "BAJAJ-AUTO", "HEROMOTOCO", "DRREDDY", "CIPLA", "DIVISLAB", "GRASIM", "JSWSTEEL", "BPCL",
    "BRITANNIA", "INDUSINDBK", "EICHERMOT", "HCLTECH", "M&M", "APOLLOHOSP", "TATACONSUM", "HDFCLIFE", "SBILIFE"
]
BANKS = ["SBIN", "HDFCBANK", "ICICIBANK", "KOTAKBANK", "AXISBANK", "INDUSINDBK"]

# Cache system
_CACHE = {}

def _cache_get(key, ttl_seconds):
    entry = _CACHE.get(key)
    if entry and (datetime.now(timezone.utc) - entry["ts"]).total_seconds() < ttl_seconds:
        return entry["data"]
    return None

def _cache_set(key, data):
    _CACHE[key] = {"data": data, "ts": datetime.now(timezone.utc)}

# Helper functions
def _mul(value, factor):
    return round(value * factor, 4) if value is not None else None

def _round(value, decimals=2):
    return round(value, decimals) if value is not None else None

# Synchronous execution logic for fundamentals
def _get_fundamentals_sync(symbol: str) -> dict:
    if symbol.startswith("^"):
        symbol_ns = symbol
    else:
        symbol_ns = f"{symbol}.NS"
        
    ticker = yf.Ticker(symbol_ns)
    info = ticker.info
    
    price = info.get("currentPrice")
    if symbol.startswith("^"):
        price = price or info.get("regularMarketPrice")
        
    if not info or price is None:
        return {"error": "Symbol not found", "symbol": symbol}
        
    return {
        "symbol": symbol,
        "price": _round(price, 2),
        "peRatio": _round(info.get("trailingPE"), 2),
        "forwardPe": _round(info.get("forwardPE"), 2),
        "roe": _round(_mul(info.get("returnOnEquity"), 100), 2),
        "debtToEquity": _round(_mul(info.get("debtToEquity"), 0.01), 2),
        "revenueGrowth": _round(_mul(info.get("revenueGrowth"), 100), 2),
        "earningsGrowth": _round(_mul(info.get("earningsGrowth"), 100), 2),
        "eps": _round(info.get("trailingEps"), 2),
        "bookValue": _round(info.get("bookValue"), 2),
        "marketCap": info.get("marketCap"),
        "beta": _round(info.get("beta"), 2),
        "week52High": _round(info.get("fiftyTwoWeekHigh"), 2),
        "week52Low": _round(info.get("fiftyTwoWeekLow"), 2),
        "sector": info.get("sector"),
        "dividendYield": _round(_mul(info.get("dividendYield"), 100), 2),
        "change": _round(info.get("regularMarketChange"), 2),
        "changePercent": _round(info.get("regularMarketChangePercent"), 2)
    }

# Async wrapper for fundamentals fetching with cache check
async def _get_fundamentals(symbol: str) -> dict:
    key = f"fund:{symbol}"
    cached = _cache_get(key, 900)
    print(f"DEBUG: cache_get {key} -> {cached is not None}")
    if cached is not None:
        return cached
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, _get_fundamentals_sync, symbol)
        if "error" not in res:
            _cache_set(key, res)
            print(f"DEBUG: cache_set {key}")
        return res
    except Exception:
        return {"error": "Symbol not found", "symbol": symbol}

# Synchronous execution logic for technical calculations
def _get_technical_sync(symbol: str) -> dict:
    if symbol.startswith("^"):
        symbol_ns = symbol
    else:
        symbol_ns = f"{symbol}.NS"
        
    ticker = yf.Ticker(symbol_ns)
    df = ticker.history(period="6mo", interval="1d")
    if df.empty:
        return {"error": "No price history", "symbol": symbol}
        
    # RSI calculation
    rsi_indicator = RSIIndicator(close=df["Close"], window=14)
    rsi_series = rsi_indicator.rsi()
    if rsi_series.empty or rsi_series.isna().all():
        rsi_val = None
    else:
        rsi_val = round(float(rsi_series.iloc[-1]), 1)
        
    # MACD calculation
    macd_indicator = MACD(close=df["Close"], window_fast=12, window_slow=26, window_sign=9)
    macd_line_series = macd_indicator.macd()
    signal_line_series = macd_indicator.macd_signal()
    diff_series = macd_indicator.macd_diff()
    
    if macd_line_series.empty or macd_line_series.isna().iloc[-1]:
        macd_line = None
    else:
        macd_line = round(float(macd_line_series.iloc[-1]), 3)
        
    if signal_line_series.empty or signal_line_series.isna().iloc[-1]:
        signal_line = None
    else:
        signal_line = round(float(signal_line_series.iloc[-1]), 3)
        
    if diff_series.empty or diff_series.isna().iloc[-1]:
        histogram = None
    else:
        histogram = round(float(diff_series.iloc[-1]), 3)
        
    # MACD Crossover logic (histogram crossed above 0 in the last 3 candles)
    h = diff_series.tail(3).tolist()
    if len(h) >= 3 and h[0] is not None and h[-1] is not None:
        macd_crossover = bool(h[0] <= 0 and h[-1] > 0)
    else:
        macd_crossover = False
        
    # Price history of last 30 closes
    df_30 = df.tail(30)
    price_history = []
    for idx, row in df_30.iterrows():
        price_history.append({
            "date": idx.strftime("%Y-%m-%d"),
            "close": round(float(row["Close"]), 2)
        })
        
    return {
        "symbol": symbol,
        "rsi": rsi_val,
        "macdLine": macd_line,
        "signalLine": signal_line,
        "histogram": histogram,
        "macdCrossover": macd_crossover,
        "priceHistory": price_history
    }

# Async wrapper for technicals fetching with cache check
async def _get_technical(symbol: str) -> dict:
    key = f"tech:{symbol}"
    cached = _cache_get(key, 300)
    if cached is not None:
        return cached
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, _get_technical_sync, symbol)
        if "error" not in res:
            _cache_set(key, res)
        return res
    except Exception:
        return {"error": "Symbol not found or calculations failed", "symbol": symbol}

# Routes
@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/fundamentals/{symbol}")
async def get_fundamentals(symbol: str):
    return await _get_fundamentals(symbol)

@app.get("/technical/{symbol}")
async def get_technical(symbol: str):
    return await _get_technical(symbol)

@app.get("/screen/{type}")
async def screen_stocks(type: str):
    valid_types = ["pe", "roe", "debt", "growth", "tech"]
    if type not in valid_types:
        return JSONResponse(status_code=400, content={"error": "invalid screener type"})
        
    cache_key = f"screen:{type}"
    cached_res = _cache_get(cache_key, 600)
    if cached_res is not None:
        return cached_res
        
    sem = asyncio.Semaphore(5)
    
    if type in ["pe", "roe", "debt", "growth"]:
        async def fetch_fund(symbol):
            async with sem:
                return await _get_fundamentals(symbol)
                
        tasks = [fetch_fund(symbol) for symbol in NIFTY_50]
        raw_results = await asyncio.gather(*tasks)
        
        results = []
        for item in raw_results:
            if not item or "error" in item:
                continue
            symbol = item["symbol"]
            price = item["price"]
            sector = item["sector"]
            
            if type == "pe":
                pe = item["peRatio"]
                if pe is not None and 5 < pe < 25:
                    results.append({
                        "symbol": symbol,
                        "price": price,
                        "metricValue": pe,
                        "metricLabel": "PE",
                        "sector": sector,
                        "signal": "CHEAP" if pe < 15 else "FAIR"
                    })
            elif type == "roe":
                roe = item["roe"]
                if roe is not None and roe > 15:
                    results.append({
                        "symbol": symbol,
                        "price": price,
                        "metricValue": roe,
                        "metricLabel": "ROE",
                        "sector": sector,
                        "signal": "EXCELLENT" if roe > 25 else "GOOD"
                    })
            elif type == "debt":
                debt = item["debtToEquity"]
                if debt is not None and debt < 0.5 and symbol not in BANKS:
                    results.append({
                        "symbol": symbol,
                        "price": price,
                        "metricValue": debt,
                        "metricLabel": "D/E",
                        "sector": sector,
                        "signal": "DEBT_FREE" if debt < 0.1 else "LOW"
                    })
            elif type == "growth":
                rev_growth = item["revenueGrowth"]
                earn_growth = item["earningsGrowth"]
                if rev_growth is not None and earn_growth is not None and rev_growth > 10 and earn_growth > 10:
                    results.append({
                        "symbol": symbol,
                        "price": price,
                        "metricValue": earn_growth,
                        "metricLabel": "Profit Growth %",
                        "sector": sector,
                        "signal": "STRONG",
                        "revenueGrowth": rev_growth,
                        "earningsGrowth": earn_growth
                    })
                    
        # Sorting
        if type in ["pe", "debt"]:
            results.sort(key=lambda x: x["metricValue"])
        elif type in ["roe", "growth"]:
            results.sort(key=lambda x: x["metricValue"], reverse=True)
            
        results = results[:10]
        
    else:  # tech
        async def fetch_tech(symbol):
            async with sem:
                return await _get_technical(symbol)
                
        tasks = [fetch_tech(symbol) for symbol in NIFTY_50]
        raw_results = await asyncio.gather(*tasks)
        
        results = []
        for item in raw_results:
            if not item or "error" in item:
                continue
            symbol = item["symbol"]
            rsi = item["rsi"]
            hist = item["histogram"]
            
            if rsi is not None and rsi < 35 and hist is not None and hist > 0:
                price = item["priceHistory"][-1]["close"] if item.get("priceHistory") else None
                results.append({
                    "symbol": symbol,
                    "price": price,
                    "metricValue": rsi,
                    "metricLabel": "RSI",
                    "sector": None,
                    "signal": "OVERSOLD",
                    "macdLine": item["macdLine"],
                    "histogram": hist,
                    "macdCrossover": item["macdCrossover"]
                })
                
        results.sort(key=lambda x: x["metricValue"])
        results = results[:10]
        
    response_data = {
        "type": type,
        "count": len(results),
        "results": results
    }
    
    _cache_set(cache_key, response_data)
    return response_data

def _get_quarterly_sync(symbol: str) -> dict:
    if symbol.startswith("^"):
        symbol_ns = symbol
    else:
        symbol_ns = f"{symbol}.NS"
        
    ticker = yf.Ticker(symbol_ns)
    qf = ticker.quarterly_financials
    
    if qf is None or qf.empty:
        return {"symbol": symbol, "revenueYoY": None, "netIncomeYoY": None, "quarters": []}
    
    import numpy as np
    
    def clean_val(v):
        if v is None:
            return None
        try:
            val = float(v)
            if np.isnan(val) or np.isinf(val):
                return None
            return val
        except:
            return None

    # Map row indexes
    idx_map = {str(row).lower().replace(" ", "").replace("_", ""): row for row in qf.index}
    
    rev_row = idx_map.get("totalrevenue") or idx_map.get("revenue") or idx_map.get("operatingrevenue")
    net_row = idx_map.get("netincome") or idx_map.get("netincomecommonstockholders") or idx_map.get("netincomefromcontinuingoperations")
    ebitda_row = idx_map.get("ebitda")

    quarters_list = []
    sorted_cols = sorted(qf.columns, reverse=True) # most recent first
    
    for col in sorted_cols[:5]:
        date_str = str(col.date()) if hasattr(col, 'date') else str(col)[:10]
        
        rev_val = clean_val(qf.loc[rev_row, col]) if rev_row else None
        net_val = clean_val(qf.loc[net_row, col]) if net_row else None
        ebitda_val = clean_val(qf.loc[ebitda_row, col]) if ebitda_row else None
        
        quarters_list.append({
            "date": date_str,
            "totalRevenue": rev_val,
            "netIncome": net_val,
            "ebitda": ebitda_val
        })

    revenue_yoy = None
    net_income_yoy = None
    if len(quarters_list) >= 5:
        cur_rev = quarters_list[0]["totalRevenue"]
        past_rev = quarters_list[4]["totalRevenue"]
        if cur_rev is not None and past_rev is not None and past_rev != 0:
            revenue_yoy = round((cur_rev - past_rev) / past_rev * 100, 2)
            
        cur_net = quarters_list[0]["netIncome"]
        past_net = quarters_list[4]["netIncome"]
        if cur_net is not None and past_net is not None and past_net != 0:
            net_income_yoy = round((cur_net - past_net) / past_net * 100, 2)

    return {
        "symbol": symbol,
        "revenueYoY": revenue_yoy,
        "netIncomeYoY": net_income_yoy,
        "quarters": quarters_list[:4]
    }

@app.get("/quarterly/{symbol}")
async def get_quarterly(symbol: str):
    symbol = symbol.upper().strip()
    key = f"quarterly:{symbol}"
    cached = _cache_get(key, 21600)
    if cached is not None:
        return cached
    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(None, _get_quarterly_sync, symbol)
        if "error" not in res:
            _cache_set(key, res)
        return res
    except Exception as e:
        return JSONResponse(status_code=200, content={"error": str(e), "symbol": symbol})

@app.get("/cache/clear")
def clear_cache():
    _CACHE.clear()
    return {"cleared": True}


