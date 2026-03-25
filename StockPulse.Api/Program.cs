using Microsoft.EntityFrameworkCore;
using StockPulse.Api.Data;
using Hangfire;
using Hangfire.PostgreSql;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<StockPulseDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Redis
var redisConfiguration = builder.Configuration.GetConnectionString("RedisConnection") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisConfiguration));

// Configure SignalR
builder.Services.AddSignalR();

// Configure Hangfire with PostgreSQL
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connectionString)));

builder.Services.AddHangfireServer();

// Add CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        corsBuilder =>
        {
            corsBuilder.WithOrigins("http://localhost:5173")
                       .AllowAnyHeader()
                       .AllowAnyMethod()
                       .AllowCredentials(); // Required for SignalR
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthorization();
app.MapControllers();
app.MapHub<StockPulse.Api.Hubs.StockHub>("/stockHub");

// Configure Hangfire Dashboard (optional, useful for debugging)
app.UseHangfireDashboard("/hangfire");

// Enqueue Background Jobs
// This runs every 1 minute
RecurringJob.AddOrUpdate<StockPulse.Api.Jobs.StockUpdateJob>("UpdateStocks", job => job.UpdateStockPrices(), "* * * * *");

app.Run();
