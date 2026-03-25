namespace StockPulse.Api.Models;

public class Watchlist
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string UserId { get; set; } = "default-user";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<WatchlistItem> Items { get; set; } = new();
}

public class WatchlistItem
{
    public int Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public int WatchlistId { get; set; }
    public Watchlist? Watchlist { get; set; }
}
