using System.Text.Json;
using StockPulse.Api.Models;

namespace StockPulse.Api.Services;

public class PythonWorkerService
{
    private readonly HttpClient _http;
    private readonly ILogger<PythonWorkerService> _log;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public PythonWorkerService(HttpClient http, IConfiguration config, ILogger<PythonWorkerService> log)
    {
        _http = http;
        _log = log;
        var baseUrl = config["PythonWorkerUrl"] ?? "http://localhost:8000";
        _http.BaseAddress = new Uri(baseUrl);
        _http.Timeout = TimeSpan.FromSeconds(60); // screeners can be slow on a cold cache
    }

    private bool IsErrorPayload(string json)
        => json.Contains("\"error\"", StringComparison.OrdinalIgnoreCase);

    public async Task<FundamentalsDto?> GetFundamentalsAsync(string symbol)
    {
        try
        {
            var json = await _http.GetStringAsync($"/fundamentals/{symbol}");
            if (IsErrorPayload(json)) return null;
            return JsonSerializer.Deserialize<FundamentalsDto>(json, JsonOpts);
        }
        catch (Exception ex) { _log.LogError(ex, "GetFundamentals failed for {Symbol}", symbol); return null; }
    }

    public async Task<TechnicalDto?> GetTechnicalAsync(string symbol)
    {
        try
        {
            var json = await _http.GetStringAsync($"/technical/{symbol}");
            if (IsErrorPayload(json)) return null;
            return JsonSerializer.Deserialize<TechnicalDto>(json, JsonOpts);
        }
        catch (Exception ex) { _log.LogError(ex, "GetTechnical failed for {Symbol}", symbol); return null; }
    }

    public async Task<List<ScreenerResultDto>> GetScreenerAsync(string type)
    {
        try
        {
            using var resp = await _http.GetAsync($"/screen/{type}");
            if (!resp.IsSuccessStatusCode) return new();
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("results", out var results)) return new();
            return JsonSerializer.Deserialize<List<ScreenerResultDto>>(results.GetRawText(), JsonOpts) ?? new();
        }
        catch (Exception ex) { _log.LogError(ex, "GetScreener failed for {Type}", type); return new(); }
    }
}
