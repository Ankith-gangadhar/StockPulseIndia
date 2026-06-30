using Microsoft.AspNetCore.Mvc;
using StockPulse.Api.Services;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api")]
public class StockDataController : ControllerBase
{
    private readonly PythonWorkerService _worker;
    public StockDataController(PythonWorkerService worker) => _worker = worker;

    [HttpGet("stock/{symbol}/fundamentals")]
    [ResponseCache(Duration = 900)]
    public async Task<IActionResult> Fundamentals(string symbol)
    {
        var data = await _worker.GetFundamentalsAsync(symbol.ToUpperInvariant());
        return data is null ? NotFound(new { error = "Symbol not found", symbol }) : Ok(data);
    }

    [HttpGet("stock/{symbol}/technical")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> Technical(string symbol)
    {
        var data = await _worker.GetTechnicalAsync(symbol.ToUpperInvariant());
        return data is null ? NotFound(new { error = "No technical data", symbol }) : Ok(data);
    }

    [HttpGet("screener/{type}")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> Screener(string type)
    {
        var allowed = new[] { "pe", "roe", "debt", "growth", "tech" };
        type = type.ToLowerInvariant();
        if (!allowed.Contains(type))
            return BadRequest(new { error = "type must be one of pe, roe, debt, growth, tech" });
        return Ok(await _worker.GetScreenerAsync(type));
    }
}
