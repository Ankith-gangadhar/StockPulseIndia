using Microsoft.AspNetCore.Mvc;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    [HttpGet("insights")]
    public IActionResult GetInsights()
    {
        var insights = new[]
        {
            new { Type = "Sector", Message = "Focus on IT stocks today due to global tech rally.", Sentiment = "Bullish" },
            new { Type = "Warning", Message = "Avoid PSU banks – bearish sentiment observed in morning trade.", Sentiment = "Bearish" },
            new { Type = "Watch", Message = "Watch Reliance – technical breakout expected above 2960.", Sentiment = "Neutral" }
        };

        return Ok(insights);
    }

    [HttpGet("news")]
    public IActionResult GetNews()
    {
        var news = new[]
        {
            new { Headline = "FIIs turn net buyers after 5 days of heavy selling.", Impact = "Positive", Time = "10 mins ago" },
            new { Headline = "RBI announces unexpected repo rate hike.", Impact = "Negative", Time = "1 hour ago" },
            new { Headline = "Govt slashes windfall tax on domestic crude oil.", Impact = "Positive", Time = "2 hours ago" }
        };

        return Ok(news);
    }
}
