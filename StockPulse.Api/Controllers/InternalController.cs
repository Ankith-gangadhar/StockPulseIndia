using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using StockPulse.Api.Hubs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("internal")]
public class InternalController : ControllerBase
{
    private readonly IHubContext<StockHub> _hubContext;
    private readonly IConfiguration _config;
    private readonly ILogger<InternalController> _log;
    private readonly IMemoryCache _cache;

    public InternalController(
        IHubContext<StockHub> hubContext,
        IConfiguration config,
        ILogger<InternalController> log,
        IMemoryCache cache)
    {
        _hubContext = hubContext;
        _config = config;
        _log = log;
        _cache = cache;
    }

    [HttpPost("price-update")]
    public async Task<IActionResult> PriceUpdate([FromBody] List<StockPriceUpdateDto> updatedStocks)
    {
        var secretKey = _config["InternalSecret"] ?? "default_internal_secret";
        if (!Request.Headers.TryGetValue("X-Internal-Key", out var headerValue) || headerValue != secretKey)
        {
            _log.LogWarning("Unauthorized attempt to push price updates.");
            return Unauthorized("Invalid internal key.");
        }

        try
        {
            // Update C# memory cache for live-quotes so client mounts get immediate updates
            const string LiveQuotesCacheKey = "LiveQuotesCache";
            var cacheList = new List<object>();
            foreach (var s in updatedStocks)
            {
                cacheList.Add(new
                {
                    symbol = s.Symbol,
                    name = s.Name,
                    price = s.Price,
                    change = s.Change,
                    changePercent = s.ChangePercent,
                    pe = s.Pe ?? 0.0,
                    marketCap = s.MarketCap ?? 0.0
                });
            }
            _cache.Set(LiveQuotesCacheKey, cacheList, TimeSpan.FromSeconds(30));

            // Broadcast to all connected SignalR web UI clients
            await _hubContext.Clients.All.SendAsync("ReceiveStockUpdates", updatedStocks);
            _log.LogInformation("Successfully broadcast {Count} live price updates via SignalR.", updatedStocks.Count);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to broadcast price updates.");
            return StatusCode(500, "Internal server error");
        }
    }
}

public record StockPriceUpdateDto(
    string Symbol,
    string Name,
    double Price,
    double Change,
    double ChangePercent,
    double? Pe,
    double? MarketCap
);
