using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace StockPulse.Api.Services;

public class NseClient
{
    private readonly HttpClient _http;
    private readonly ILogger<NseClient> _log;
    private DateTime _cookieTs = DateTime.MinValue;

    public NseClient(ILogger<NseClient> log)
    {
        _log = log;
        var handler = new HttpClientHandler { CookieContainer = new CookieContainer(), UseCookies = true };
        _http = new HttpClient(handler);
        _http.DefaultRequestHeaders.Add("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36");
        _http.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
        _http.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
        _http.DefaultRequestHeaders.Add("Referer", "https://www.nseindia.com/");
        _http.Timeout = TimeSpan.FromSeconds(20);
    }

    private async Task EnsureSession()
    {
        // refresh cookies every ~5 min
        if ((DateTime.UtcNow - _cookieTs).TotalMinutes < 5) return;
        try 
        { 
            await _http.GetAsync("https://www.nseindia.com"); 
            _cookieTs = DateTime.UtcNow; 
        }
        catch (Exception ex) 
        { 
            _log.LogWarning(ex, "NSE session warmup failed"); 
        }
    }

    public async Task<string?> GetJsonAsync(string apiPath)
    {
        try
        {
            await EnsureSession();
            var resp = await _http.GetAsync($"https://www.nseindia.com{apiPath}");
            if (!resp.IsSuccessStatusCode)
            {
                // one retry with a fresh session
                _cookieTs = DateTime.MinValue; 
                await EnsureSession();
                resp = await _http.GetAsync($"https://www.nseindia.com{apiPath}");
            }
            return resp.IsSuccessStatusCode ? await resp.Content.ReadAsStringAsync() : null;
        }
        catch (Exception ex) 
        { 
            _log.LogWarning(ex, "NSE call failed {Path}", apiPath); 
            return null; 
        }
    }
}
