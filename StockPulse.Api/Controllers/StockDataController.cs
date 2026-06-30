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

    [HttpGet("signals/buy")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> TopBuys([FromServices] BuySignalService svc)
        => Ok(await svc.GetTopSignalsAsync());

    [HttpGet("signals/buy/{symbol}")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> BuyFor(string symbol, [FromServices] BuySignalService svc)
    {
        var r = await svc.CalculateForSymbolAsync(symbol.ToUpperInvariant());
        return r is null ? NotFound() : Ok(r);
    }

    [HttpGet("stock/{symbol}/quarterly")]
    [ResponseCache(Duration = 3600)]
    public async Task<IActionResult> Quarterly(string symbol)
    {
        var d = await _worker.GetQuarterlyAsync(symbol.ToUpperInvariant());
        return d is null ? NotFound() : Ok(d);
    }

    [HttpGet("market/fiidii")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> FiiDii([FromServices] NseClient nse, [FromServices] ILogger<StockDataController> log)
    {
        var json = await nse.GetJsonAsync("/api/fiidiiTradeReact");
        if (json is null) return Ok(new List<FiiDiiDto>());
        
        log.LogInformation("Raw FII/DII JSON: {Json}", json);

        var list = new List<FiiDiiDto>();
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var date = GetStringValue(el, "date", "Date");
                    if (string.IsNullOrWhiteSpace(date)) continue;

                    var fiiNet = GetDecimalValue(el, "fiiNet", "fiiNetValue", "fiiNetValueRupeesCrore", "fiiNetPurchaseSales");
                    if (fiiNet == null)
                    {
                        var buy = GetDecimalValue(el, "fiiBuy", "fiiBuyValue");
                        var sell = GetDecimalValue(el, "fiiSell", "fiiSellValue");
                        if (buy != null && sell != null) fiiNet = buy.Value - sell.Value;
                    }

                    var diiNet = GetDecimalValue(el, "diiNet", "diiNetValue", "diiNetValueRupeesCrore", "diiNetPurchaseSales");
                    if (diiNet == null)
                    {
                        var buy = GetDecimalValue(el, "diiBuy", "diiBuyValue");
                        var sell = GetDecimalValue(el, "diiSell", "diiSellValue");
                        if (buy != null && sell != null) diiNet = buy.Value - sell.Value;
                    }

                    if (fiiNet != null || diiNet != null)
                    {
                        list.Add(new FiiDiiDto(date, fiiNet ?? 0, diiNet ?? 0));
                    }
                }
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to parse FII/DII JSON");
            return Ok(new List<FiiDiiDto>());
        }

        var sortedList = list
            .Select(item => new { Item = item, ParsedDate = ParseNseDate(item.Date) ?? DateTime.MinValue })
            .OrderByDescending(x => x.ParsedDate)
            .Select(x => x.Item)
            .Take(5)
            .ToList();

        return Ok(sortedList);
    }

    private static decimal? GetDecimalValue(System.Text.Json.JsonElement el, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (el.TryGetProperty(key, out var prop))
            {
                if (prop.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    return prop.GetDecimal();
                }
                if (prop.ValueKind == System.Text.Json.JsonValueKind.String && decimal.TryParse(prop.GetString(), out var val))
                {
                    return val;
                }
            }
            foreach (var p in el.EnumerateObject())
            {
                if (string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase))
                {
                    if (p.Value.ValueKind == System.Text.Json.JsonValueKind.Number)
                    {
                        return p.Value.GetDecimal();
                    }
                    if (p.Value.ValueKind == System.Text.Json.JsonValueKind.String && decimal.TryParse(p.Value.GetString(), out var val))
                    {
                        return val;
                    }
                }
            }
        }
        return null;
    }

    private static string? GetStringValue(System.Text.Json.JsonElement el, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (el.TryGetProperty(key, out var prop))
            {
                return prop.GetString();
            }
            foreach (var p in el.EnumerateObject())
            {
                if (string.Equals(p.Name, key, StringComparison.OrdinalIgnoreCase))
                {
                    return p.Value.GetString();
                }
            }
        }
        return null;
    }

    private static DateTime? ParseNseDate(string dateStr)
    {
        if (DateTime.TryParseExact(dateStr, "dd-MMM-yyyy", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var d))
            return d;
        if (DateTime.TryParse(dateStr, System.Globalization.CultureInfo.InvariantCulture, out var d2))
            return d2;
        return null;
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

