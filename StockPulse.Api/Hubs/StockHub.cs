using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace StockPulse.Api.Hubs;

public class StockHub : Hub
{
    // Clients can call this method to explicitly request a refresh if needed
    public async Task RequestUpdate()
    {
        // For now, doing nothing. The server (via Hangfire/Tickers) will push to clients.
        await Clients.Caller.SendAsync("ReceiveMessage", "System", "Update requested");
    }
}
