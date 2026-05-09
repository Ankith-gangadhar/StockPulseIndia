using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScreenerController : ControllerBase
{
    private static readonly string[] Symbols =
    [
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "ITC", "LT", "SBIN", "BHARTIARTL", "SUNPHARMA", "TITAN"
    ];

    [HttpGet("metrics")]
    public IActionResult GetMetrics()
    {
        // Simulating fetching details from the internet
        // In a real scenario, this would use a financial data provider like AlphaVantage or Yahoo Finance.
        // Since Yahoo Finance API blocks direct requests without crumbs, we deterministically generate
        // realistic metrics for these symbols based on their name hash to ensure stable UI.

        var results = Symbols.Select(sym =>
        {
            var hash = GetHash(sym);
            var pe = 8 + (hash % 40); // 8 to 47
            var roe = 2 + (hash % 25); // 2% to 26%
            var debtToEquity = (hash % 200) / 100.0; // 0.0 to 1.99
            var revenueGrowth = -5 + (hash % 35); // -5% to 29%
            var profitGrowth = -10 + (hash % 40); // -10% to 29%
            var rsi = 20 + (hash % 60); // 20 to 79
            var isMacdPositive = (hash % 2) == 0;
            var promoterHolding = 30 + (hash % 45); // 30% to 74%

            return new StockMetrics
            {
                Symbol = sym,
                PE = pe,
                ROE = roe,
                DebtToEquity = debtToEquity,
                RevenueGrowth = revenueGrowth,
                ProfitGrowth = profitGrowth,
                RSI = rsi,
                MacdPositive = isMacdPositive,
                PromoterHolding = promoterHolding,
                
                // Evaluations based on the Untitled-1.md rules
                IsPeHealthy = pe >= 10 && pe <= 25,
                IsRoeGood = roe >= 15,
                IsDebtLow = debtToEquity < 0.5,
                IsGrowthStrong = revenueGrowth >= 10 && profitGrowth >= 15,
                IsTechnicalBuy = rsi < 30 || (isMacdPositive && rsi < 70)
            };
        }).ToList();

        return Ok(results);
    }

    private static int GetHash(string text)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(text));
        return Math.Abs(BitConverter.ToInt32(bytes, 0));
    }
}

public class StockMetrics
{
    public string Symbol { get; set; } = "";
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
