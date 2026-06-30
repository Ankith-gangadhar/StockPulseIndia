using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using StockPulse.Api.Models;
using StockPulse.Api.Services;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/insights")]
public class InsightsController : ControllerBase
{
    private readonly BuySignalService _signals;
    private readonly NewsService _news;
    private readonly PythonWorkerService _worker;

    public InsightsController(BuySignalService signals, NewsService news, PythonWorkerService worker)
    {
        _signals = signals;
        _news = news;
        _worker = worker;
    }

    [HttpGet("daily")]
    [ResponseCache(Duration = 600)]
    public async Task<IActionResult> Daily()
    {
        var cards = new List<InsightCardDto>();

        // 1) Strong buys
        var top = await _signals.GetTopSignalsAsync();
        foreach (var s in top.Where(x => x.Signal == "STRONG_BUY"))
        {
            cards.Add(new InsightCardDto("BULLISH",
                $"{s.Symbol} shows a strong buy setup",
                $"RSI at {(s.Rsi.HasValue ? s.Rsi.Value.ToString("F0") : "—")}, ROE {(s.Roe.HasValue ? s.Roe.Value.ToString("F0") : "—")}%, PE {(s.Pe.HasValue ? s.Pe.Value.ToString("F0") : "—")}x. Score {s.Score}/100.",
                s.Symbol));
        }

        // 2) Broad market via ^NSEI
        var nifty = await _worker.GetFundamentalsAsync("^NSEI");
        if (nifty?.ChangePercent is decimal chg)
        {
            if (chg > 0.5m)
                cards.Add(new InsightCardDto("BULLISH", "Broad market momentum positive",
                    $"NIFTY 50 up {chg:F2}% today.", null));
            else if (chg < -0.5m)
                cards.Add(new InsightCardDto("BEARISH", "Broad market under pressure",
                    $"NIFTY 50 down {chg:F2}% today.", null));
        }

        // 3) Overbought check across top signals' RSI
        var rsis = top.Where(t => t.Rsi.HasValue).Select(t => t.Rsi!.Value).ToList();
        if (rsis.Count > 0 && rsis.Count(r => r > 65) >= Math.Max(1, rsis.Count / 2))
            cards.Add(new InsightCardDto("WARNING", "Several leaders look overbought",
                "Multiple names show RSI above 65. Consider waiting for a pullback.", null));

        // 4) News sentiment
        var news = await _news.GetNewsAsync();
        int pos = news.Count(n => n.Sentiment == "POSITIVE");
        int neg = news.Count(n => n.Sentiment == "NEGATIVE");
        if (neg - pos >= 3)
            cards.Add(new InsightCardDto("BEARISH", "Negative news sentiment today",
                $"{neg} negative headlines vs {pos} positive. Watch for volatility.", null));
        else if (pos - neg >= 3)
            cards.Add(new InsightCardDto("BULLISH", "Positive news sentiment today",
                $"{pos} positive headlines vs {neg} negative.", null));

        if (cards.Count == 0)
            cards.Add(new InsightCardDto("NEUTRAL", "Markets are quiet",
                "No strong setups or signals right now. A calm session.", null));

        return Ok(cards);
    }
}
