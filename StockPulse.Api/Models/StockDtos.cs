namespace StockPulse.Api.Models;

public record FundamentalsDto(
    string Symbol,
    decimal? Price,
    decimal? PeRatio,
    decimal? ForwardPe,
    decimal? Roe,
    decimal? DebtToEquity,
    decimal? RevenueGrowth,
    decimal? EarningsGrowth,
    decimal? Eps,
    decimal? BookValue,
    long? MarketCap,
    decimal? Beta,
    decimal? Week52High,
    decimal? Week52Low,
    string? Sector,
    decimal? DividendYield,
    decimal? Change,
    decimal? ChangePercent
);

public record PricePoint(string Date, decimal Close);

public record TechnicalDto(
    string Symbol,
    decimal Rsi,
    decimal MacdLine,
    decimal SignalLine,
    decimal Histogram,
    bool MacdCrossover,
    List<PricePoint> PriceHistory
);

public record ScreenerResultDto(
    string Symbol,
    decimal Price,
    decimal MetricValue,
    string MetricLabel,
    string? Sector,
    string Signal
);

public record MarketStatusDto(
    bool IsOpen,
    string Session,         // "pre-market" | "open" | "post-market" | "closed"
    string NextOpenIst,     // ISO 8601 string
    int RemainingMinutes
);
