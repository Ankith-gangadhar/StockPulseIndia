using Microsoft.AspNetCore.Mvc;
using StockPulse.Api.Services;
using StockPulse.Api.Models;

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

    [HttpGet("market/status")]
    public IActionResult MarketStatus()
    {
        var istNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, IstZone());
        var time = istNow.TimeOfDay;
        var day = istNow.DayOfWeek;
        bool isWeekday = day != DayOfWeek.Saturday && day != DayOfWeek.Sunday;

        bool isOpen = false;
        string session = "closed";
        int remainingMinutes = 0;

        if (isWeekday)
        {
            if (time >= new TimeSpan(9, 0, 0) && time < new TimeSpan(9, 15, 0))
            {
                session = "pre-market";
            }
            else if (time >= new TimeSpan(9, 15, 0) && time < new TimeSpan(15, 30, 0))
            {
                session = "open";
                isOpen = true;
            }
            else if (time >= new TimeSpan(15, 30, 0) && time < new TimeSpan(16, 0, 0))
            {
                session = "post-market";
            }
        }

        DateTimeOffset nextOpen = GetNextOpenTime(istNow);

        if (isOpen)
        {
            var closeTime = new DateTimeOffset(istNow.Year, istNow.Month, istNow.Day, 15, 30, 0, istNow.Offset);
            remainingMinutes = (int)(closeTime - istNow).TotalMinutes;
        }
        else
        {
            remainingMinutes = (int)(nextOpen - istNow).TotalMinutes;
        }

        return Ok(new MarketStatusDto(
            isOpen,
            session,
            nextOpen.ToString("yyyy-MM-ddTHH:mm:sszzz"),
            remainingMinutes
        ));
    }

    private TimeZoneInfo IstZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }      // Linux/Mac
        catch { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); } // Windows
    }

    private DateTimeOffset GetNextOpenTime(DateTimeOffset istNow)
    {
        var date = istNow.Date;
        var day = date.DayOfWeek;
        bool isWeekday = day != DayOfWeek.Saturday && day != DayOfWeek.Sunday;

        if (isWeekday && istNow.TimeOfDay < new TimeSpan(9, 15, 0))
        {
            return new DateTimeOffset(date.Year, date.Month, date.Day, 9, 15, 0, istNow.Offset);
        }
        else
        {
            var nextDate = date.AddDays(1);
            while (nextDate.DayOfWeek == DayOfWeek.Saturday || nextDate.DayOfWeek == DayOfWeek.Sunday)
            {
                nextDate = nextDate.AddDays(1);
            }
            return new DateTimeOffset(nextDate.Year, nextDate.Month, nextDate.Day, 9, 15, 0, istNow.Offset);
        }
    }
}

