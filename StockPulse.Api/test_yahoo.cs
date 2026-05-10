using System;
using System.Threading.Tasks;
using YahooQuotesApi;
using System.Linq;

class Program
{
    static async Task Main(string[] args)
    {
        var yahooQuotes = new YahooQuotesBuilder()
            .WithHistoryParameter(HistoryFlags.None)
            .Build();

        var quotes = await yahooQuotes.GetAsync(new[] { "RELIANCE.NS", "TCS.NS" });
        
        foreach (var q in quotes)
        {
            var sec = q.Value;
            if (sec != null)
            {
                Console.WriteLine($"{sec.Symbol}: PE={sec.TrailingPE}, ROE={sec.EpsTrailingTwelveMonths}, Price={sec.RegularMarketPrice}");
            }
        }
    }
}
