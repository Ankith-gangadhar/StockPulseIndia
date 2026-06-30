using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using StockPulse.Api.Services;

namespace StockPulse.Api.Controllers;

[ApiController]
[Route("api/news")]
public class NewsController : ControllerBase
{
    private readonly NewsService _news;
    public NewsController(NewsService news) => _news = news;

    [HttpGet]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> All() => Ok(await _news.GetNewsAsync());

    [HttpGet("{symbol}")]
    public async Task<IActionResult> ForSymbol(string symbol)
    {
        var all = await _news.GetNewsAsync();
        var s = symbol.ToLowerInvariant();
        return Ok(all.Where(n => n.Headline.ToLowerInvariant().Contains(s)).ToList());
    }
}
