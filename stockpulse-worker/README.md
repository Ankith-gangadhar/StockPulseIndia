# StockPulse India - Data Worker

This is the Python-based data worker microservice for StockPulse India. It is responsible for fetching real-time and historical stock data using `yfinance`, processing technical indicators, and providing endpoints for the API.

## Requirements

- Python 3.8+

## How to Run Locally

1. Navigate to this directory:
   ```bash
   cd stockpulse-worker
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD):**
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - **macOS/Linux:**
     ```bash
     source .venv/bin/activate
     ```

4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

## Endpoints

- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
- **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- Additional data fetching and analysis endpoints will be added in subsequent phases.
