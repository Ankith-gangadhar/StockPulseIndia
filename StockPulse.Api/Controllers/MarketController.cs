using Microsoft.AspNetCore.Mvc;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarketController : ControllerBase
{
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

    public sealed record MarketSymbol(string Symbol, string Name, string TradingViewSymbol);
}
