from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI(title="StockPulse Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _mul(value, factor):
    return round(value * factor, 4) if value is not None else None

def _round(value, decimals=2):
    return round(value, decimals) if value is not None else None

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/fundamentals/{symbol}")
def get_fundamentals(symbol: str):
    try:
        # Determine ticker symbol for Yahoo Finance
        if symbol.startswith("^"):
            symbol_ns = symbol
        else:
            symbol_ns = f"{symbol}.NS"
            
        ticker = yf.Ticker(symbol_ns)
        info = ticker.info
        
        # Determine price (support index fallback)
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
    except Exception:
        return {"error": "Symbol not found", "symbol": symbol}

