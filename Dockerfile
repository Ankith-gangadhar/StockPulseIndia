FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the csproj and restore as distinct layers
COPY ["StockPulse.Api/StockPulse.Api.csproj", "StockPulse.Api/"]
RUN dotnet restore "StockPulse.Api/StockPulse.Api.csproj"

# Copy the rest of the code and build
COPY . .
WORKDIR "/src/StockPulse.Api"
RUN dotnet publish "StockPulse.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "StockPulse.Api.dll"]
