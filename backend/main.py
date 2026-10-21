
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pythermalcomfort.models import utci
from pythermalcomfort.models import solar_gain
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from astral import Observer
from astral.sun import elevation, azimuth


app = FastAPI(
    title="THERMOCORTEX API",
    description="Environmental heat-stress calculation service",
    version="1.0.0",
)

# Allow the local React/Vite dashboard to call this API.
app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class UTCIRequest(BaseModel):
    air_temperature: float = Field(ge=-50, le=60)
    mean_radiant_temperature: float = Field(ge=-50, le=80)
    wind_speed: float = Field(ge=0.5, le=30)
    relative_humidity: float = Field(ge=0, le=100)


@app.get("/")
def home():
    return {
        "project": "THERMOCORTEX",
        "status": "running",
        "message": "Heat-stress API is ready",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/utci")
def calculate_utci(data: UTCIRequest):
    try:
        result = utci(
            tdb=data.air_temperature,
            tr=data.mean_radiant_temperature,
            v=data.wind_speed,
            rh=data.relative_humidity,
            units="SI",
        )

        value = float(result.utci)

        if value < -40:
            category = "Extreme cold stress"
        elif value < -27:
            category = "Very strong cold stress"
        elif value < -13:
            category = "Strong cold stress"
        elif value < 0:
            category = "Moderate cold stress"
        elif value < 9:
            category = "Slight cold stress"
        elif value < 26:
            category = "No thermal stress"
        elif value < 32:
            category = "Moderate heat stress"
        elif value < 38:
            category = "Strong heat stress"
        elif value < 46:
            category = "Very strong heat stress"
        else:
            category = "Extreme heat stress"

        return {
            "utci_celsius": round(value, 2),
            "category": category,
            "unit": "°C",
            "method": "UTCI",
            "note": (
                "This result depends on the supplied mean radiant "
                "temperature and wind speed. It is only as reliable "
                "as those input measurements or estimates."
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"UTCI calculation failed: {str(exc)}",
        ) from exc
    
@app.get("/solar-test")
def solar_test():
    return {
        "status": "ready",
        "solar_gain_available": True,
        "sun_position_available": True,
        "message": "Ready to build the sunlight-versus-shade comparison",
    }


@app.post("/utci-comparison")
def calculate_utci_comparison(data: UTCIRequest):
    try:
        observer = Observer(latitude=23.0225, longitude=72.5714)
        now = datetime.now().astimezone()

        sun_altitude = elevation(observer, now)
        sun_azimuth = azimuth(observer, now)

        sharp = abs((sun_azimuth + 180) % 360 - 180)
        direct_beam = 600.0

        if sun_altitude <= 0:
            open_delta_mrt = 0.0
            shade_delta_mrt = 0.0
        else:
            open_solar = solar_gain(
                sol_altitude=min(90.0, sun_altitude),
                sharp=sharp,
                sol_radiation_dir=max(200.0, min(1000.0, direct_beam)),
                sol_transmittance=1.0,
                f_svv=1.0,
                f_bes=0.5,
                posture="standing",
            )

            shaded_solar = solar_gain(
                sol_altitude=min(90.0, sun_altitude),
                sharp=sharp,
                sol_radiation_dir=max(200.0, min(1000.0, direct_beam)),
                sol_transmittance=0.0,
                f_svv=0.5,
                f_bes=0.0,
                posture="standing",
            )

            open_delta_mrt = float(open_solar.delta_mrt)
            shade_delta_mrt = float(shaded_solar.delta_mrt)

        baseline_mrt = data.air_temperature
        open_mrt = baseline_mrt + open_delta_mrt
        shaded_mrt = baseline_mrt + shade_delta_mrt

        open_result = utci(
            tdb=data.air_temperature,
            tr=open_mrt,
            v=data.wind_speed,
            rh=data.relative_humidity,
            units="SI",
        )

        shaded_result = utci(
            tdb=data.air_temperature,
            tr=shaded_mrt,
            v=data.wind_speed,
            rh=data.relative_humidity,
            units="SI",
        )

        return {
            "method": "UTCI with illustrative solar-gain scenarios",
            "location": {
                "latitude": 23.0225,
                "longitude": 72.5714,
                "name": "Ahmedabad (fixed prototype location)",
            },
            "assumptions": [
                "Baseline MRT is approximated by air temperature.",
                "Person is standing and facing north.",
                "Direct radiation is a placeholder, not live weather data.",
                "Shade is idealized as zero direct solar transmission.",
                "Results are scenario estimates, not measured exposure.",
            ],
            "sun_altitude_degrees": round(sun_altitude, 2),
            "sun_azimuth_degrees": round(sun_azimuth, 2),
            "open_sun": {
                "utci_celsius": round(float(open_result.utci), 2),
                "category": str(open_result.stress_category),
                "estimated_mrt_celsius": round(open_mrt, 2),
                "solar_delta_mrt_celsius": round(open_delta_mrt, 2),
            },
            "shade": {
                "utci_celsius": round(float(shaded_result.utci), 2),
                "category": str(shaded_result.stress_category),
                "estimated_mrt_celsius": round(shaded_mrt, 2),
                "solar_delta_mrt_celsius": round(shade_delta_mrt, 2),
            },
            "note": (
                "Prototype comparison only. Replace placeholder radiation "
                "with time-matched weather data and improve MRT modelling "
                "before operational or public-health use."
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"UTCI comparison failed: {str(exc)}",
        ) from exc
