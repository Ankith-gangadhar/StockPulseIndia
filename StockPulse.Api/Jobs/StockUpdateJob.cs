using Microsoft.AspNetCore.SignalR;
using StockPulse.Api.Hubs;
using StackExchange.Redis;
using System.Text.Json;

namespace StockPulse.Api.Jobs;

public class StockUpdateJob
{
    private readonly IHubContext<StockHub> _hubContext;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<StockUpdateJob> _logger;
    private static readonly Random _random = new();

    // Mock initial data
    private static readonly List<dynamic> _stocks = new()
    {
        new { Symbol = "RELIANCE", Name = "Reliance Industries", Price = 2950.0m, Change = 12.5m, ChangePercent = 0.42m },
        new { Symbol = "TCS", Name = "Tata Consultancy Services", Price = 3800.0m, Change = -15.0m, ChangePercent = -0.39m },
        new { Symbol = "HDFCBANK", Name = "HDFC Bank", Price = 1450.0m, Change = 5.0m, ChangePercent = 0.35m },
        new { Symbol = "INFY", Name = "Infosys", Price = 1620.0m, Change = 22.0m, ChangePercent = 1.38m },
        new { Symbol = "ITC", Name = "ITC Ltd", Price = 430.0m, Change = -2.0m, ChangePercent = -0.46m }
    };

    public StockUpdateJob(IHubContext<StockHub> hubContext, IConnectionMultiplexer redis, ILogger<StockUpdateJob> logger)
    {
        _hubContext = hubContext;
        _redis = redis;
        _logger = logger;
    }

    public async Task UpdateStockPrices()
    {
        _logger.LogInformation("Updating mock stock prices...");

        var updatedStocks = new List<dynamic>();

        foreach (var stock in _stocks)
        {
            // Simulate random price movement between -1% and +1%
            var movementPercent = (decimal)(_random.NextDouble() * 2 - 1) / 100m;
            decimal newPrice = stock.Price * (1 + movementPercent);
            decimal newChange = newPrice - stock.Price;
            decimal newChangePercent = (newChange / stock.Price) * 100;

            var updatedStock = new
            {
                Symbol = stock.Symbol,
                Name = stock.Name,
                Price = Math.Round(newPrice, 2),
                Change = Math.Round(newChange, 2),
                ChangePercent = Math.Round(newChangePercent, 2),
                Timestamp = DateTime.UtcNow
            };

            updatedStocks.Add(updatedStock);
        }

        // Store latest prices in Redis Database 0
        var db = _redis.GetDatabase();
        var serializedData = JsonSerializer.Serialize(updatedStocks);
        await db.StringSetAsync("latest_stocks", serializedData);

        // Broadcast to all connected Web UI clients (React)
        await _hubContext.Clients.All.SendAsync("ReceiveStockUpdates", updatedStocks);

        _logger.LogInformation("Pushed updated prices to SignalR and Redis.");
    }
}
