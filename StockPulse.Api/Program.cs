using Microsoft.EntityFrameworkCore;
using StockPulse.Api.Data;
using Hangfire;
using Hangfire.PostgreSql;
using StackExchange.Redis;
using Npgsql;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

// Configure PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<StockPulseDbContext>(options =>
    options.UseNpgsql(connectionString));

// Redis and Hangfire are optional for local development. Keep APIs up even when infra is down.
var redisConnectionString = builder.Configuration.GetConnectionString("RedisConnection");
IConnectionMultiplexer? redisMultiplexer = null;
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    try
    {
        var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
        redisOptions.AbortOnConnectFail = false;
        redisMultiplexer = ConnectionMultiplexer.Connect(redisOptions);
        builder.Services.AddSingleton(redisMultiplexer);
    }
    catch
    {
        // App should still start for API endpoints that do not require Redis.
    }
}

// Configure SignalR
builder.Services.AddSignalR();

var hangfireEnabled = IsPostgresReachable(connectionString);
if (hangfireEnabled)
{
    // Configure Hangfire with PostgreSQL
    builder.Services.AddHangfire(config => config
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connectionString)));

    builder.Services.AddHangfireServer();
}

// Add CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        corsBuilder =>
        {
            corsBuilder.WithOrigins("http://localhost:5173", "https://stock-pulse-india.vercel.app")
                       .AllowAnyHeader()
                       .AllowAnyMethod()
                       .AllowCredentials(); // Required for SignalR
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.MapOpenApi();
app.MapScalarApiReference();

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthorization();
app.MapControllers();
app.MapHub<StockPulse.Api.Hubs.StockHub>("/stockHub");

if (hangfireEnabled)
{
    // Configure Hangfire Dashboard (optional, useful for debugging)
    app.UseHangfireDashboard("/hangfire");

    if (redisMultiplexer is not null)
    {
        // Enqueue Background Jobs
        // This runs every 1 minute
        RecurringJob.AddOrUpdate<StockPulse.Api.Jobs.StockUpdateJob>("UpdateStocks", job => job.UpdateStockPrices(), "* * * * *");
    }
    else
    {
        app.Logger.LogWarning("Skipping stock background job because Redis is unavailable.");
    }
}
else
{
    app.Logger.LogWarning("PostgreSQL is unavailable. Hangfire background jobs are disabled.");
}

if (redisMultiplexer is null)
{
    app.Logger.LogWarning("Redis is unavailable. Real-time stock updates cache/broadcast may be limited.");
}

app.Run();

static bool IsPostgresReachable(string? connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return false;
    }

    try
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Timeout = 3
        };

        using var connection = new NpgsqlConnection(builder.ConnectionString);
        connection.Open();
        return true;
    }
    catch
    {
        return false;
    }
}
