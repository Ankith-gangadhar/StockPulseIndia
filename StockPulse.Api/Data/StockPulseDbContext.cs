using Microsoft.EntityFrameworkCore;
using StockPulse.Api.Models;

namespace StockPulse.Api.Data;

public class StockPulseDbContext : DbContext
{
    public StockPulseDbContext(DbContextOptions<StockPulseDbContext> options)
        : base(options)
    {
    }

    public DbSet<Watchlist> Watchlists { get; set; }
    public DbSet<WatchlistItem> WatchlistItems { get; set; }
}
