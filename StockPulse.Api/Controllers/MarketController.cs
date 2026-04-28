using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Net.Http;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarketController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public MarketController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
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
    public IActionResult GetSymbols([FromQuery] string? query = null)
    {
        var normalized = query?.Trim();
        var results = string.IsNullOrWhiteSpace(normalized)
            ? Symbols.Take(10).ToList()
            : Symbols
                .Where(s =>
                    s.Symbol.Contains(normalized, StringComparison.OrdinalIgnoreCase) ||
                    s.Name.Contains(normalized, StringComparison.OrdinalIgnoreCase))
                .Take(10)
                .ToList();

        return Ok(results);
    }

    [HttpGet("chart-config")]
    public IActionResult GetChartConfig([FromQuery] string symbol, [FromQuery] string timeframe = "1d")
    {
        var matched = Symbols.FirstOrDefault(s => s.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase));
        if (matched is null)
        {
            return NotFound(new { Message = "Symbol not supported for TradingView chart config." });
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
            $"https://s.tradingview.com/widgetembed/?symbol={Uri.EscapeDataString(matched.TradingViewSymbol)}&interval={interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0f172a&theme=dark&style=1&studies=[]&withdateranges=1&hideideas=1";
        var fullChartUrl =
            $"https://www.tradingview.com/chart/?symbol={Uri.EscapeDataString(matched.TradingViewSymbol)}&interval={interval}";

        return Ok(new
        {
            matched.Symbol,
            matched.Name,
            TradingViewSymbol = matched.TradingViewSymbol,
            Timeframe = timeframe,
            Interval = interval,
            EmbedUrl = embedUrl,
            FullChartUrl = fullChartUrl
        });
    }

    [HttpGet("live-quotes")]
    public async Task<IActionResult> GetLiveQuotes()
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        
        var symbols = "RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS,ITC.NS,LT.NS,SBIN.NS,BHARTIARTL.NS,SUNPHARMA.NS,TITAN.NS,ADANIPORTS.NS,WIPRO.NS,^NSEI";
        var url = $"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbols}";
        
        try 
        {
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            
            using var document = JsonDocument.Parse(json);
            var result = document.RootElement.GetProperty("quoteResponse").GetProperty("result");
            
            var stocks = new List<object>();
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
            
            return Ok(stocks);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "Failed to fetch live quotes", Error = ex.Message });
        }
    }

    public sealed record MarketSymbol(string Symbol, string Name, string TradingViewSymbol);
}
