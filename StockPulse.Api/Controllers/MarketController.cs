using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Net.Http;
using Microsoft.Extensions.Caching.Memory;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarketController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    public MarketController(IHttpClientFactory httpClientFactory, IMemoryCache cache)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
    }
    private static readonly IReadOnlyList<MarketSymbol> Symbols =
    [
        new("RELIANCE", "Reliance Industries", "NSE:RELIANCE"),
        new("TCS", "Tata Consultancy Services", "NSE:TCS"),
        new("INFY", "Infosys", "NSE:INFY"),
        new("HDFCBANK", "HDFC Bank", "NSE:HDFCBANK"),
        new("ITC", "ITC Ltd", "NSE:ITC"),
        new("LT", "Larsen & Toubro", "NSE:LT"),
        new("SBIN", "State Bank of India", "NSE:SBIN"),
        new("BHARTIARTL", "Bharti Airtel", "NSE:BHARTIARTL"),
        new("SUNPHARMA", "Sun Pharmaceutical", "NSE:SUNPHARMA"),
        new("TITAN", "Titan Company", "NSE:TITAN"),
        new("NIFTY 50", "NIFTY 50 Index", "NSE:NIFTY"),
        new("BANK NIFTY", "NIFTY Bank Index", "NSE:BANKNIFTY"),
        new("SENSEX", "BSE SENSEX", "BSE:SENSEX"),
    ];

    [HttpGet("symbols")]
    public async Task<IActionResult> GetSymbols([FromQuery] string? query = null)
    {
        var normalized = query?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return Ok(Symbols.Take(10).ToList());
        }

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
        var url = $"https://query2.finance.yahoo.com/v1/finance/search?q={Uri.EscapeDataString(normalized)}&quotesCount=10&newsCount=0";

        try
        {
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                // Fallback to local search
                var fallback = Symbols
                    .Where(s =>
                        s.Symbol.Contains(normalized, StringComparison.OrdinalIgnoreCase) ||
                        s.Name.Contains(normalized, StringComparison.OrdinalIgnoreCase))
                    .Take(10)
                    .ToList();
                return Ok(fallback);
            }

            var json = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(json);
            
            if (!document.RootElement.TryGetProperty("quotes", out var quotesProp) || quotesProp.ValueKind != JsonValueKind.Array)
            {
                return Ok(new List<object>());
            }

            var results = new List<object>();
            foreach (var item in quotesProp.EnumerateArray())
            {
                var symbol = item.TryGetProperty("symbol", out var symProp) ? symProp.GetString() : null;
                if (string.IsNullOrEmpty(symbol)) continue;

                var name = item.TryGetProperty("shortname", out var nameProp) ? nameProp.GetString() : null;
                if (string.IsNullOrEmpty(name))
                {
                    name = item.TryGetProperty("longname", out var longNameProp) ? longNameProp.GetString() : symbol;
                }

                var exchDisp = item.TryGetProperty("exchDisp", out var exchProp) ? exchProp.GetString() : "";

                // Map to TradingView format
                string tradingViewSymbol = "";
                if (symbol.EndsWith(".NS", StringComparison.OrdinalIgnoreCase))
                {
                    var cleanSym = symbol.Substring(0, symbol.Length - 3);
                    tradingViewSymbol = $"NSE:{cleanSym}";
                }
                else if (symbol.EndsWith(".BO", StringComparison.OrdinalIgnoreCase))
                {
                    var cleanSym = symbol.Substring(0, symbol.Length - 3);
                    tradingViewSymbol = $"BSE:{cleanSym}";
                }
                else if (symbol.Equals("^NSEI", StringComparison.OrdinalIgnoreCase))
                {
                    tradingViewSymbol = "NSE:NIFTY";
                }
                else if (symbol.Equals("^BSESN", StringComparison.OrdinalIgnoreCase))
                {
                    tradingViewSymbol = "BSE:SENSEX";
                }
                else
                {
                    var exch = string.IsNullOrEmpty(exchDisp) ? "NASDAQ" : exchDisp.ToUpperInvariant();
                    if (exch == "BOMBAY") exch = "BSE";
                    tradingViewSymbol = $"{exch}:{symbol}";
                }

                results.Add(new
                {
                    Symbol = symbol,
                    Name = name,
                    TradingViewSymbol = tradingViewSymbol
                });
            }

            if (results.Count == 0)
            {
                var fallback = Symbols
                    .Where(s =>
                        s.Symbol.Contains(normalized, StringComparison.OrdinalIgnoreCase) ||
                        s.Name.Contains(normalized, StringComparison.OrdinalIgnoreCase))
                    .Take(10)
                    .ToList();
                return Ok(fallback);
            }

            return Ok(results);
        }
        catch
        {
            var fallback = Symbols
                .Where(s =>
                    s.Symbol.Contains(normalized, StringComparison.OrdinalIgnoreCase) ||
                    s.Name.Contains(normalized, StringComparison.OrdinalIgnoreCase))
                .Take(10)
                .ToList();
            return Ok(fallback);
        }
    }

    [HttpGet("chart-config")]
    public IActionResult GetChartConfig([FromQuery] string symbol, [FromQuery] string timeframe = "1d")
    {
        var matched = Symbols.FirstOrDefault(s => s.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase) || s.TradingViewSymbol.Equals(symbol, StringComparison.OrdinalIgnoreCase));
        
        string resolvedSymbol = symbol;
        string resolvedName = symbol;
        string tradingViewSymbol = "";

        if (matched is not null)
        {
            resolvedSymbol = matched.Symbol;
            resolvedName = matched.Name;
            tradingViewSymbol = matched.TradingViewSymbol;
        }
        else
        {
            // Parse symbol dynamically
            if (symbol.Contains(':'))
            {
                tradingViewSymbol = symbol.ToUpperInvariant();
                var parts = symbol.Split(':');
                resolvedSymbol = parts[1];
                resolvedName = parts[1];
            }
            else if (symbol.EndsWith(".NS", StringComparison.OrdinalIgnoreCase))
            {
                resolvedSymbol = symbol.Substring(0, symbol.Length - 3).ToUpperInvariant();
                resolvedName = resolvedSymbol;
                tradingViewSymbol = $"NSE:{resolvedSymbol}";
            }
            else if (symbol.EndsWith(".BO", StringComparison.OrdinalIgnoreCase))
            {
                resolvedSymbol = symbol.Substring(0, symbol.Length - 3).ToUpperInvariant();
                resolvedName = resolvedSymbol;
                tradingViewSymbol = $"BSE:{resolvedSymbol}";
            }
            else if (symbol.Equals("^NSEI", StringComparison.OrdinalIgnoreCase))
            {
                resolvedSymbol = "NIFTY 50";
                resolvedName = "NIFTY 50 Index";
                tradingViewSymbol = "NSE:NIFTY";
            }
            else if (symbol.Equals("^BSESN", StringComparison.OrdinalIgnoreCase))
            {
                resolvedSymbol = "SENSEX";
                resolvedName = "BSE SENSEX";
                tradingViewSymbol = "BSE:SENSEX";
            }
            else
            {
                resolvedSymbol = symbol.ToUpperInvariant();
                resolvedName = resolvedSymbol;
                tradingViewSymbol = $"NSE:{resolvedSymbol}";
            }
        }

        var interval = timeframe.ToLowerInvariant() switch
        {
            "15m" => "15",
            "1h" => "60",
            "6h" => "240",
            "1d" => "D",
            "1w" => "W",
            "1m" => "M",
            "6m" => "M",
            "1y" => "W",
            "3y" => "W",
            "5y" => "M",
            _ => "D"
        };

        var embedUrl =
            $"https://s.tradingview.com/widgetembed/?symbol={Uri.EscapeDataString(tradingViewSymbol)}&interval={interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0f172a&theme=dark&style=1&studies=[]&withdateranges=1&hideideas=1";
        var fullChartUrl =
            $"https://www.tradingview.com/chart/?symbol={Uri.EscapeDataString(tradingViewSymbol)}&interval={interval}";

        return Ok(new
        {
            Symbol = resolvedSymbol,
            Name = resolvedName,
            TradingViewSymbol = tradingViewSymbol,
            Timeframe = timeframe,
            Interval = interval,
            EmbedUrl = embedUrl,
            FullChartUrl = fullChartUrl
        });
    }

    [HttpGet("live-quotes")]
    public async Task<IActionResult> GetLiveQuotes()
    {
        const string LiveQuotesCacheKey = "LiveQuotesCache";
        if (_cache.TryGetValue(LiveQuotesCacheKey, out List<object>? cachedQuotes) && cachedQuotes != null)
        {
            return Ok(cachedQuotes);
        }

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
        
        var (cookie, crumb) = await GetYahooCredentialsAsync(client);
        
        var symbols = "RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS,ITC.NS,LT.NS,SBIN.NS,BHARTIARTL.NS,SUNPHARMA.NS,TITAN.NS,ADANIPORTS.NS,WIPRO.NS,^NSEI";
        var url = $"https://query2.finance.yahoo.com/v7/finance/quote?symbols={Uri.EscapeDataString(symbols)}";
        if (!string.IsNullOrEmpty(crumb))
        {
            url += $"&crumb={crumb}";
        }

        var stocks = new List<object>();

        try 
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            if (!string.IsNullOrEmpty(cookie))
            {
                request.Headers.Add("Cookie", cookie);
            }

            using var response = await client.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(json);
                var result = document.RootElement.GetProperty("quoteResponse").GetProperty("result");
                
                foreach (var item in result.EnumerateArray())
                {
                    var sym = item.GetProperty("symbol").GetString()?.Replace(".NS", "").Replace("^NSEI", "NIFTY 50");
                    var price = item.TryGetProperty("regularMarketPrice", out var p) ? p.GetDouble() : 0;
                    var change = item.TryGetProperty("regularMarketChange", out var c) ? c.GetDouble() : 0;
                    var changePercent = item.TryGetProperty("regularMarketChangePercent", out var cp) ? cp.GetDouble() : 0;
                    var name = item.TryGetProperty("shortName", out var sn) ? sn.GetString() : sym;
                    var pe = item.TryGetProperty("trailingPE", out var peProp) ? peProp.GetDouble() : 0;
                    var marketCap = item.TryGetProperty("marketCap", out var mc) ? mc.GetDouble() : 0;
                    
                    stocks.Add(new {
                        symbol = sym,
                        name = name,
                        price = price,
                        change = change,
                        changePercent = changePercent,
                        pe = pe,
                        marketCap = marketCap
                    });
                }
            }
        }
        catch
        {
            // Fall back
        }

        if (stocks.Count == 0)
        {
            stocks = GetMockLiveQuotes();
        }

        _cache.Set(LiveQuotesCacheKey, stocks, TimeSpan.FromSeconds(30));
        return Ok(stocks);
    }

    private async Task<(string Cookie, string Crumb)> GetYahooCredentialsAsync(HttpClient client)
    {
        try
        {
            using var response = await client.GetAsync("https://fc.yahoo.com");
            string cookie = "";
            if (response.Headers.TryGetValues("Set-Cookie", out var cookieHeaders))
            {
                cookie = string.Join("; ", cookieHeaders.Select(c => c.Split(';')[0]));
            }

            if (string.IsNullOrEmpty(cookie))
            {
                return ("", "");
            }

            using var crumbReq = new HttpRequestMessage(HttpMethod.Get, "https://query2.finance.yahoo.com/v1/test/getcrumb");
            crumbReq.Headers.Add("Cookie", cookie);

            using var crumbResponse = await client.SendAsync(crumbReq);
            crumbResponse.EnsureSuccessStatusCode();
            string crumb = await crumbResponse.Content.ReadAsStringAsync();
            return (cookie, crumb.Trim());
        }
        catch
        {
            return ("", "");
        }
    }

    private List<object> GetMockLiveQuotes()
    {
        return new List<object>
        {
            new { symbol = "RELIANCE", name = "RELIANCE INDUSTRIES LTD", price = 1313.20, change = -1.40, changePercent = -0.11, pe = 22.0, marketCap = 17770842423296.0 },
            new { symbol = "TCS", name = "TATA CONSULTANCY SERVICES", price = 3850.50, change = 24.50, changePercent = 0.64, pe = 28.5, marketCap = 14052000000000.0 },
            new { symbol = "INFY", name = "INFOSYS LTD", price = 1420.20, change = -12.30, changePercent = -0.86, pe = 20.1, marketCap = 5900000000000.0 },
            new { symbol = "HDFCBANK", name = "HDFC BANK LTD", price = 1510.10, change = 5.20, changePercent = 0.35, pe = 17.2, marketCap = 11400000000000.0 },
            new { symbol = "ITC", name = "ITC LTD", price = 410.55, change = -2.10, changePercent = -0.51, pe = 24.8, marketCap = 5100000000000.0 },
            new { symbol = "LT", name = "LARSEN & TOUBRO LTD", price = 3450.00, change = 15.65, changePercent = 0.46, pe = 35.1, marketCap = 4850000000000.0 },
            new { symbol = "SBIN", name = "STATE BANK OF INDIA", price = 740.15, change = -4.30, changePercent = -0.58, pe = 9.2, marketCap = 6600000000000.0 },
            new { symbol = "BHARTIARTL", name = "BHARTI AIRTEL LTD", price = 1120.30, change = 18.20, changePercent = 1.65, pe = 55.4, marketCap = 6350000000000.0 },
            new { symbol = "SUNPHARMA", name = "SUN PHARMACEUTICAL IND", price = 1540.60, change = 9.80, changePercent = 0.64, pe = 38.2, marketCap = 3700000000000.0 },
            new { symbol = "TITAN", name = "TITAN COMPANY LTD", price = 3650.00, change = -22.50, changePercent = -0.61, pe = 82.5, marketCap = 3250000000000.0 },
            new { symbol = "ADANIPORTS", name = "ADANI PORTS & SEZ", price = 1250.40, change = 14.20, changePercent = 1.15, pe = 32.1, marketCap = 2700000000000.0 },
            new { symbol = "WIPRO", name = "WIPRO LTD", price = 480.25, change = -3.40, changePercent = -0.70, pe = 22.4, marketCap = 2500000000000.0 },
            new { symbol = "NIFTY 50", name = "NIFTY 50 Index", price = 22350.00, change = 42.10, changePercent = 0.19, pe = 22.8, marketCap = 0.0 }
        };
    }

    public sealed record MarketSymbol(string Symbol, string Name, string TradingViewSymbol);
}
