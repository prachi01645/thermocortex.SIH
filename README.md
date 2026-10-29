[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white)
![Weather Data](https://img.shields.io/badge/Weather-Open--Meteo-2196F3)
![Status](https://img.shields.io/badge/status-prototype-orange)



# THERMOCORTEX
### Extreme Heatwave Early Warning & Human Thermal Stress Intelligence

**THERMOCORTEX** is a heat-risk monitoring dashboard being developed for **Smart India Hackathon 2026 — Problem Statement 26083**. The project aims to move beyond temperature-only alerts by considering environmental conditions that influence human thermal stress.

## The Problem

High air temperature alone does not fully describe how dangerous outdoor conditions can be. Relative humidity, wind speed and solar exposure can change how the human body experiences heat.

THERMOCORTEX aims to combine relevant weather data with interpretable thermal-risk indicators to support more context-aware heat warnings and practical safety guidance.

## Current Prototype

The project is under active development. The current prototype includes:

- A React-based web dashboard
- City selection for Ahmedabad, Nagpur, Delhi and Kolkata
- Current weather conditions and a 12-hour forecast using Open-Meteo
- Weather indicators including temperature, relative humidity, wind speed, UV and solar-related data where provided
- Wet-bulb temperature and NOAA Heat Index displays
- A backend health-check endpoint
- Heat-safety precautions and regional comparison visuals

**Development note:** Regional comparison scores and risk categories that are marked as illustrative in the interface are not validated health predictions. A validated, city-specific thermal-stress methodology and forecasting engine remain development goals.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript, HTML, CSS |
| Frontend tooling | Vite, npm |
| Backend | Python, FastAPI |
| Weather data | Open-Meteo |
| Data visualization | Dashboard-based visual indicators |

## Project Architecture

The intended workflow is:

1. **Weather input:** Retrieve relevant weather observations and forecast data.
2. **Data processing:** Organize environmental variables for the selected location.
3. **Thermal-risk analysis:** Develop and validate an explainable heat-stress methodology.
4. **Risk communication:** Present understandable indicators and location-specific guidance.
5. **Future improvements:** Add validated risk forecasts, spatial comparisons and alerting as these capabilities are implemented.

Steps 3–5 are being developed and should not be interpreted as fully implemented capabilities.

## Run Locally

### Prerequisites

- Node.js and npm
- Python 3
- Git

### 1. Clone the repository

```bash
git clone https://github.com/prachi01645/thermocortex.SIH.git
cd thermocortex.SIH
```

### 2. Start the frontend

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

### 3. Start the backend

Open a second terminal:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies required by the project, then run:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

**Dependency note:** A backend dependency file will be added as the project is standardized. Until then, install the packages imported by `backend/main.py` in your environment. If the frontend requires a specific API URL, configure it according to the existing frontend code.

## Roadmap

- [ ] Document and validate the thermal-stress calculation methodology
- [ ] Develop city-specific risk calculations using appropriate environmental inputs
- [ ] Add explainable risk levels and supporting factors
- [ ] Improve forecast-based heat-risk communication
- [ ] Enhance regional visualizations and location comparisons
- [ ] Add appropriate, evidence-based safety guidance
- [ ] Add automated tests and reproducible setup instructions
- [ ] Document data sources, assumptions and limitations

## Responsible Use

THERMOCORTEX is a developing prototype, not a certified medical or public-warning system. Its outputs should not replace official weather alerts, public-health advice or professional guidance. Risk calculations must be validated before being used for operational decisions.

## Data Source

- [Open-Meteo](https://open-meteo.com/) — weather data and forecast services. Refer to the applicable API documentation and terms for attribution and usage requirements.

## Repository

[GitHub — prachi01645/thermocortex.SIH](https://github.com/prachi01645/thermocortex.SIH)

---

Developed for Smart India Hackathon 2026, Problem Statement 26083.
