using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using StockPulse.Api.Models;

namespace StockPulse.Api.Services;

public class BuySignalService
{
    private readonly PythonWorkerService _worker;
    private readonly ILogger<BuySignalService> _log;

    private static readonly string[] Nifty50 = {
        "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","KOTAKBANK",
        "SBIN","BHARTIARTL","ITC","ASIANPAINT","AXISBANK","MARUTI","WIPRO","LT","SUNPHARMA","ULTRACEMCO","TITAN",
        "BAJFINANCE","NESTLEIND","POWERGRID","NTPC","TECHM","HINDUNILVR","ADANIPORTS","COALINDIA","ONGC",
        "TATAMOTORS","TATASTEEL","BAJAJ-AUTO","HEROMOTOCO","DRREDDY","CIPLA","DIVISLAB","GRASIM","JSWSTEEL",
        "BPCL","BRITANNIA","INDUSINDBK","EICHERMOT","HCLTECH","M&M","APOLLOHOSP","TATACONSUM","HDFCLIFE","SBILIFE"
    };

    private static readonly HashSet<string> Banks = new(StringComparer.OrdinalIgnoreCase) {
        "SBIN","HDFCBANK","ICICIBANK","KOTAKBANK","AXISBANK","INDUSINDBK"
    };

    public BuySignalService(PythonWorkerService worker, ILogger<BuySignalService> log)
    {
        _worker = worker;
        _log = log;
    }

    public async Task<BuySignalDto?> CalculateForSymbolAsync(string symbol)
    {
        try
        {
            var fundTask = _worker.GetFundamentalsAsync(symbol);
            var techTask = _worker.GetTechnicalAsync(symbol);

            await Task.WhenAll(fundTask, techTask);

            var fund = await fundTask;
            var tech = await techTask;

            if (fund == null || !fund.Price.HasValue)
            {
                return null;
            }

            bool isBank = Banks.Contains(symbol);
            decimal price = fund.Price.Value;

            // Subscores
            int peScore = 7;
            if (fund.PeRatio.HasValue)
            {
                decimal pe = fund.PeRatio.Value;
                if (isBank)
                {
                    if (pe < 10) peScore = 25;
                    else if (pe >= 10 && pe <= 15) peScore = 20;
                    else if (pe > 15 && pe <= 20) peScore = 12;
                    else peScore = 5;
                }
                else
                {
                    if (pe < 12) peScore = 25;
                    else if (pe >= 12 && pe <= 18) peScore = 20;
                    else if (pe > 18 && pe <= 25) peScore = 14;
                    else if (pe > 25 && pe <= 35) peScore = 7;
                    else peScore = 0;
                }
            }

            int roeScore = 7;
            if (fund.Roe.HasValue)
            {
                decimal roe = fund.Roe.Value;
                if (roe > 25) roeScore = 25;
                else if (roe >= 20 && roe <= 25) roeScore = 20;
                else if (roe >= 15 && roe <= 20) roeScore = 14;
                else if (roe >= 10 && roe <= 15) roeScore = 7;
                else roeScore = 0;
            }

            int techScore = 7;
            decimal? rsi = null;
            bool macdCrossover = false;
            if (tech != null)
            {
                rsi = tech.Rsi;
                macdCrossover = tech.MacdCrossover;

                if (rsi < 25) techScore = 25;
                else if (rsi >= 25 && rsi <= 30) techScore = 20;
                else if (rsi > 30 && rsi <= 40) techScore = 14;
                else if (rsi > 40 && rsi <= 50) techScore = 7;
                else if (rsi > 50 && rsi <= 60) techScore = 3;
                else techScore = 0;

                if (macdCrossover)
                {
                    techScore += 5;
                }
                if (techScore > 25) techScore = 25;
            }

            int debtScore = 7;
            if (isBank)
            {
                debtScore = 10;
            }
            else if (fund.DebtToEquity.HasValue)
            {
                decimal de = fund.DebtToEquity.Value;
                if (de < 0.1m) debtScore = 15;
                else if (de >= 0.1m && de <= 0.3m) debtScore = 12;
                else if (de > 0.3m && de <= 0.7m) debtScore = 9;
                else if (de > 0.7m && de <= 1.5m) debtScore = 5;
                else debtScore = 0;
            }

            int growthScore = 3;
            if (fund.RevenueGrowth.HasValue && fund.EarningsGrowth.HasValue)
            {
                decimal rev = fund.RevenueGrowth.Value;
                decimal earn = fund.EarningsGrowth.Value;

                if (rev < 0 || earn < 0) growthScore = 0;
                else if (rev > 20 && earn > 20) growthScore = 10;
                else if (rev > 10 && earn > 10) growthScore = 7;
                else if (rev > 10 || earn > 10) growthScore = 4;
                else growthScore = 2;
            }

            int totalScore = peScore + roeScore + techScore + debtScore + growthScore;

            string signal = "AVOID";
            if (totalScore >= 75) signal = "STRONG_BUY";
            else if (totalScore >= 55) signal = "BUY";
            else if (totalScore >= 35) signal = "WATCHLIST";

            // Build reasons
            var reasons = new List<string>();
            if (rsi.HasValue && rsi.Value < 30)
                reasons.Add($"RSI at {rsi.Value:F0} — oversold territory, technical buy zone");
            
            if (fund.Roe.HasValue && fund.Roe.Value > 20)
                reasons.Add($"ROE strong at {fund.Roe.Value:F0}% — efficient management");
            
            if (fund.PeRatio.HasValue && fund.PeRatio.Value < 18)
                reasons.Add($"PE of {fund.PeRatio.Value:F0}x — fairly to attractively valued");
            
            if (!isBank && fund.DebtToEquity.HasValue && fund.DebtToEquity.Value < 0.3m)
                reasons.Add($"D/E low at {fund.DebtToEquity.Value:F2} — minimal debt");
            
            if (macdCrossover)
                reasons.Add("MACD just crossed bullish — momentum turning up");

            return new BuySignalDto(
                symbol, totalScore, signal, price,
                fund.PeRatio, fund.Roe, rsi, fund.DebtToEquity, fund.RevenueGrowth,
                reasons
            );
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed calculating buy signal for {Symbol}", symbol);
            return null;
        }
    }

    public async Task<List<BuySignalDto>> GetTopSignalsAsync()
    {
        var semaphore = new SemaphoreSlim(5);
        var tasks = Nifty50.Select(async symbol =>
        {
            await semaphore.WaitAsync();
            try
            {
                return await CalculateForSymbolAsync(symbol);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);
        return results
            .OfType<BuySignalDto>()
            .Where(r => r.Signal == "STRONG_BUY" || r.Signal == "BUY")
            .OrderByDescending(r => r.Score)
            .Take(5)
            .ToList();
    }
}
