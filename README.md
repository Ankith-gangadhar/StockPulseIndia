# StockPulse India
Real-time Indian stock market screener terminal — no broker account, no PAN, free data sources.

## Architecture
stockpulse-ui (Vercel)  →  StockPulse.Api (Render)  →  stockpulse-worker (Render)  →  yfinance / NSE JSON / RSS
                                     ↓
                              Neon PostgreSQL

## Local Setup
1. **Worker:**   
   ```bash
   cd stockpulse-worker
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
2. **Backend (API):**  
   ```bash
   cd StockPulse.Api
   dotnet restore
   dotnet run --urls "http://localhost:5200"
   ```
3. **Frontend (UI):** 
   ```bash
   cd stockpulse-ui
   npm install
   npm run dev
   ``` (Runs Vite dev server on `http://localhost:5173`)

## Environment Configurations
- **Worker (`stockpulse-worker`):** 
  - `API_URL`: URL of the C# backend endpoint (e.g. `https://stockpulse-api.onrender.com`).
  - `INTERNAL_SECRET`: Shared authorization secret matching C# configuration for secure price pushing.
- **Backend (`StockPulse.Api`):** 
  - `PythonWorkerUrl`: Base address of the FastAPI worker (e.g. `https://stockpulse-worker.onrender.com`).
  - `ConnectionStrings__DefaultConnection`: Database connection string for Neon Serverless Postgres.
  - `AllowedCorsOrigins`: Comma-separated list of allowed origins (defaults to localhost & vercel).
  - `InternalSecret`: Security key validating worker-to-backend price update payloads.
- **Frontend:** 
  - `VITE_API_URL`: URL of the C# backend API (defaults to local fallback).

## Render Blueprint Deployments (Free Option)
You can deploy both the C# backend and Python worker services to Render for free using the Blueprint spec file [render.yaml](file:///d:/Bloomberg%20Terminal%20Stock/StockPulseIndia/render.yaml):
1. Create a free account at **[Render.com](https://render.com)**.
2. Link your GitHub repository.
3. Select **Blueprints** from the Render dashboard.
4. Render will automatically parse the `render.yaml` file, provision the services, and prompt you to input the environment variable secrets.

## Data Sources (Free, No Registration)
- **Yahoo Finance (`yfinance`):** Real-time stock prices, indices, fundamentals, technical metrics, and quarterly reports.
- **NSE India Public API:** Net Institutional Flows (FII/DII) data.
- **RSS Feeds:** Headlines and updates from the Economic Times, Moneycontrol, and Business Standard.

## Notes & Disclaimer
- **Institutional Flows Rate-Limiting:** Public NSE endpoints may periodically block requests originating from public cloud provider IP ranges; the FII/DII flows widget is designed to degrade gracefully in production if the endpoints become unreachable.
- **Purpose:** This terminal is developed strictly for educational and screening purposes — it is not financial advice, nor does it connect to any trade execution or order management systems.
