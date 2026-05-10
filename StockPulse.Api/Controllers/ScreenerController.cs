using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Text.Json;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScreenerController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;

    public ScreenerController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    private static readonly string[] Symbols =
    [
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "ITC", "LT", "SBIN", "BHARTIARTL", "SUNPHARMA", "TITAN"
    ];

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var handler = new HttpClientHandler
        {
            CookieContainer = new CookieContainer(),
            AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate | DecompressionMethods.Brotli
        };

        using var client = new HttpClient(handler);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json,text/plain,*/*");
        client.DefaultRequestHeaders.Referrer = new Uri("https://www.nseindia.com/");

        try
        {
            // Prime NSE cookies first.
            await client.GetAsync("https://www.nseindia.com/");

            var tasks = Symbols.Select(symbol => FetchMetricsFromNse(client, symbol));
            var results = await Task.WhenAll(tasks);
            return Ok(results.OrderBy(x => x.Symbol));
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { Message = "Failed to fetch screener metrics from NSE.", Error = ex.Message });
        }
    }

    private static async Task<StockMetrics> FetchMetricsFromNse(HttpClient client, string symbol)
    {
        try
        {
            var url = $"https://www.nseindia.com/api/quote-equity?symbol={Uri.EscapeDataString(symbol)}";
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var companyName = root.TryGetProperty("info", out var info) &&
                              info.TryGetProperty("companyName", out var companyProp)
                ? companyProp.GetString() ?? symbol
                : symbol;

            var price = root.TryGetProperty("priceInfo", out var priceInfo) &&
                        priceInfo.TryGetProperty("lastPrice", out var lp) &&
                        lp.TryGetDouble(out var priceVal)
                ? priceVal
                : 0d;

            var changePercent = root.TryGetProperty("priceInfo", out var pInfo) &&
                                pInfo.TryGetProperty("pChange", out var pChange) &&
                                pChange.TryGetDouble(out var cp)
                ? cp
                : 0d;

            var pe = root.TryGetProperty("metadata", out var metadata) &&
                     metadata.TryGetProperty("pdSymbolPe", out var peProp) &&
                     peProp.TryGetDouble(out var peVal)
                ? peVal
                : 0d;

            var rsiEstimate = Math.Clamp(50 + (changePercent * 2), 15, 85);
            var technicalPositive = changePercent > 0;

            return new StockMetrics
            {
                Symbol = symbol,
                CompanyName = companyName,
                Price = price,
                PE = pe,
                ROE = 0,
                DebtToEquity = 0,
                RevenueGrowth = 0,
                ProfitGrowth = 0,
                RSI = rsiEstimate,
                MacdPositive = technicalPositive,
                PromoterHolding = 0,
                IsPeHealthy = pe >= 10 && pe <= 25,
                IsRoeGood = false,
                IsDebtLow = false,
                IsGrowthStrong = false,
                IsTechnicalBuy = rsiEstimate < 30 || technicalPositive
            };
        }
        catch
        {
            return new StockMetrics
            {
                Symbol = symbol,
                CompanyName = symbol,
                Price = 0,
                PE = 0,
                ROE = 0,
                DebtToEquity = 0,
                RevenueGrowth = 0,
                ProfitGrowth = 0,
                RSI = 50,
                MacdPositive = false,
                PromoterHolding = 0,
                IsPeHealthy = false,
                IsRoeGood = false,
                IsDebtLow = false,
                IsGrowthStrong = false,
                IsTechnicalBuy = false
            };
        }
    }
}

public class StockMetrics
{
    public string Symbol { get; set; } = "";
    public string CompanyName { get; set; } = "";
    public double Price { get; set; }
    public double PE { get; set; }
    public double ROE { get; set; }
    public double DebtToEquity { get; set; }
    public double RevenueGrowth { get; set; }
    public double ProfitGrowth { get; set; }
    public double RSI { get; set; }
    public bool MacdPositive { get; set; }
    public double PromoterHolding { get; set; }

    public bool IsPeHealthy { get; set; }
    public bool IsRoeGood { get; set; }
    public bool IsDebtLow { get; set; }
    public bool IsGrowthStrong { get; set; }
    public bool IsTechnicalBuy { get; set; }
}
