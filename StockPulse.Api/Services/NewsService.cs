using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.ServiceModel.Syndication;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.Extensions.Logging;
using StockPulse.Api.Models;

namespace StockPulse.Api.Services;

public class NewsService
{
    private readonly ILogger<NewsService> _log;
    private List<NewsItemDto> _cache = new();
    private DateTime _cacheTs = DateTime.MinValue;

    private static readonly (string Url, string Source)[] Feeds =
    {
        ("https://economictimes.indiatimes.com/markets/rss.cms", "ET"),
        ("https://www.moneycontrol.com/rss/buzzingstocks.xml", "MC"),
        ("https://www.business-standard.com/rss/markets-106.rss", "BS"),
    };
    private static readonly string[] Positive = {"surge","rally","profit","growth","record","strong","buy",
        "upgrade","beat","boost","gains","up","rise","bullish","recovery","jump","soar","high"};
    private static readonly string[] Negative = {"crash","fall","loss","decline","weak","sell","downgrade",
        "miss","cut","concern","slump","drop","bearish","risk","plunge","worry","low"};

    public NewsService(ILogger<NewsService> log) => _log = log;

    private static string Score(string headline)
    {
        var h = headline.ToLowerInvariant();
        int pos = Positive.Count(w => h.Contains(w));
        int neg = Negative.Count(w => h.Contains(w));
        return pos > neg ? "POSITIVE" : neg > pos ? "NEGATIVE" : "NEUTRAL";
    }

    public async Task<List<NewsItemDto>> GetNewsAsync()
    {
        if ((DateTime.UtcNow - _cacheTs).TotalMinutes < 5 && _cache.Count > 0) return _cache;

        var items = new List<NewsItemDto>();
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        client.Timeout = TimeSpan.FromSeconds(15);

        foreach (var (url, source) in Feeds)
        {
            try
            {
                var xml = await client.GetStringAsync(url);
                using var stringReader = new StringReader(xml);
                using var xmlReader = XmlReader.Create(stringReader);
                var feed = SyndicationFeed.Load(xmlReader);
                foreach (var it in feed.Items.Take(5))
                {
                    var title = it.Title?.Text?.Trim() ?? "";
                    if (string.IsNullOrWhiteSpace(title)) continue;
                    items.Add(new NewsItemDto(
                        title, source,
                        it.PublishDate.UtcDateTime,
                        it.Links.FirstOrDefault()?.Uri.ToString() ?? "",
                        Score(title)));
                }
            }
            catch (Exception ex) { _log.LogWarning(ex, "RSS failed for {Url}", url); }
        }

        // de-dupe by first 40 chars, newest first
        var deduped = items
            .GroupBy(i => i.Headline.Length >= 40 ? i.Headline[..40] : i.Headline)
            .Select(g => g.OrderByDescending(x => x.PublishedAt).First())
            .OrderByDescending(i => i.PublishedAt)
            .Take(15).ToList();

        _cache = deduped; _cacheTs = DateTime.UtcNow;
        return deduped;
    }
}
