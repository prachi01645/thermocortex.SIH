import { useEffect, useState } from 'react'
import './App.css'

// These scores are intentionally labelled as demonstration values.
// They are not calculated from live weather and are not validated predictions.
const cities = [
  { name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714, risk: 'Critical', score: 89 },
  { name: 'Nagpur', latitude: 21.1458, longitude: 79.0882, risk: 'High', score: 82 },
  { name: 'Delhi', latitude: 28.6139, longitude: 77.209, risk: 'High', score: 74 },
  { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, risk: 'Elevated', score: 63 },
]

const navigation = [
  'Overview',
  'Heat-risk map',
  'Forecast timeline',
  'Human impact',
  'Response priorities',
  'Method & data',
]

// NOAA Heat Index (Rothfusz regression), calculated from air temperature and RH.
// The index assumes shade and light wind; it does not directly include solar radiation or wind.
function calculateHeatIndex(tempC, humidity) {
  if (tempC == null || humidity == null || !Number.isFinite(Number(tempC)) || !Number.isFinite(Number(humidity))) return null

  const tempF = (Number(tempC) * 9) / 5 + 32
  const rh = Math.min(100, Math.max(0, Number(humidity)))

  // NOAA's heat-index guidance is intended for temperatures around 80°F and above.
  if (tempF < 80) return null

  let hi = 0.5 * (tempF + 61 + (tempF - 68) * 1.2 + rh * 0.094)
  hi = (hi + tempF) / 2

  if (hi >= 80) {
    hi =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * rh -
      0.22475541 * tempF * rh -
      0.00683783 * tempF * tempF -
      0.05481717 * rh * rh +
      0.00122874 * tempF * tempF * rh +
      0.00085282 * tempF * rh * rh -
      0.00000199 * tempF * tempF * rh * rh

    if (rh < 13 && tempF >= 80 && tempF <= 112) {
      hi -= ((13 - rh) / 4) * Math.sqrt(Math.max(0, (17 - Math.abs(tempF - 95)) / 17))
    } else if (rh > 85 && tempF >= 80 && tempF <= 87) {
      hi += ((rh - 85) / 10) * ((87 - tempF) / 5)
    }
  }

  const celsius = (hi - 32) * 5 / 9
  let category
  let description
  if (hi < 90) {
    category = 'Caution'
    description = 'Possible fatigue with prolonged exposure or activity.'
  } else if (hi < 103) {
    category = 'Extreme caution'
    description = 'Heat-related effects become more likely with prolonged exposure or activity.'
  } else if (hi < 125) {
    category = 'Danger'
    description = 'Heat-related illness is possible; reduce exposure and follow official guidance.'
  } else {
    category = 'Extreme danger'
    description = 'Very high heat risk; follow official emergency and public-health guidance.'
  }

  return { celsius, fahrenheit: hi, category, description }
}

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '—'
  }
  return `${value}${suffix}`
}

function formatHour(time) {
  if (!time || typeof time !== 'string') return '—'
  const clock = time.slice(11, 16)
  const [hoursText, minutes] = clock.split(':')
  const hours = Number(hoursText)
  if (!Number.isFinite(hours)) return clock || '—'
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes || '00'} ${suffix}`
}

function formatForecastDay(time, currentTime) {
  if (!time || typeof time !== 'string') return ''
  const day = time.slice(0, 10)
  const currentDay = currentTime && typeof currentTime === 'string' ? currentTime.slice(0, 10) : ''
  if (day === currentDay) return 'Today'
  const tomorrow = new Date(`${currentDay}T12:00:00`)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (currentDay && day === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`) return 'Tomorrow'
  return day
}

function App() {
  const [selectedCity, setSelectedCity] = useState(cities[0])
  const [activeTab, setActiveTab] = useState('Overview')
  const [weather, setWeather] = useState(null)
  
const [utciResult, setUtciResult] = useState(null)
const [utciStatus, setUtciStatus] = useState('Not calculated')

  
const [backendStatus, setBackendStatus] = useState('Checking backend…')

  const [forecast, setForecast] = useState([])
  const [forecastStatus, setForecastStatus] = useState('Loading hourly forecast…')
  const [weatherStatus, setWeatherStatus] = useState('Loading live weather…')
  const [weatherError, setWeatherError] = useState(false)
  const heatIndex = weather ? calculateHeatIndex(weather.temperature_2m, weather.relative_humidity_2m) : null
  
useEffect(() => {
  let cancelled = false

  async function checkBackend() {
    try {
      const response = await fetch('http://127.0.0.1:8000/health')

      if (!response.ok) {
        throw new Error('Backend health check failed')
      }

      const data = await response.json()

      if (!cancelled) {
        setBackendStatus(
          data.status === 'healthy' ? 'Connected' : 'Unexpected response'
        )
      }
    } catch {
      if (!cancelled) {
        setBackendStatus('Unavailable — start backend')
      }
    }
  }

  checkBackend()

  return () => {
    cancelled = true
  }
}, [])


  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      try {
        const params = new URLSearchParams({
          latitude: String(selectedCity.latitude),
          longitude: String(selectedCity.longitude),
          current:
            'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index,shortwave_radiation',
         
hourly:
  'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index,shortwave_radiation,wet_bulb_temperature_2m,direct_radiation,diffuse_radiation,direct_normal_irradiance',

          forecast_days: '2',
          timezone: 'auto',
        })

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`,
        )

        if (!response.ok) {
          throw new Error('Weather request failed')
        }

        const data = await response.json()
        const current = data?.current

        if (
          !current ||
          current.temperature_2m == null ||
          current.relative_humidity_2m == null
        ) {
          throw new Error('Required weather data unavailable')
        }

        if (!cancelled) {
          const hourly = data?.hourly
          const times = Array.isArray(hourly?.time) ? hourly.time : []
          const currentTime = current.time || ''
          const startIndex = times.findIndex((time) => time >= currentTime)
          const currentWetBulb = startIndex >= 0 ? (hourly?.wet_bulb_temperature_2m?.[startIndex] ?? null) : null
          
const currentDirectRadiation =
  startIndex >= 0 ? (hourly?.direct_radiation?.[startIndex] ?? null) : null

const currentDiffuseRadiation =
  startIndex >= 0 ? (hourly?.diffuse_radiation?.[startIndex] ?? null) : null

const currentDirectNormalIrradiance =
  startIndex >= 0 ? (hourly?.direct_normal_irradiance?.[startIndex] ?? null) : null

          
setWeather({
  ...current,
  wet_bulb_temperature_2m: currentWetBulb,
  direct_radiation: currentDirectRadiation,
  diffuse_radiation: currentDiffuseRadiation,
  direct_normal_irradiance: currentDirectNormalIrradiance,
})

          setWeatherError(false)
          setWeatherStatus(
            `Live weather connected · Open-Meteo · ${current.time || 'Latest available observation'}`,
          )

          if (startIndex >= 0 && times.length) {
            const hours = times.slice(startIndex, startIndex + 12).map((time, offset) => ({
              time,
              temperature: hourly.temperature_2m?.[startIndex + offset] ?? null,
              humidity: hourly.relative_humidity_2m?.[startIndex + offset] ?? null,
              apparent: hourly.apparent_temperature?.[startIndex + offset] ?? null,
              wind: hourly.wind_speed_10m?.[startIndex + offset] ?? null,
              uv: hourly.uv_index?.[startIndex + offset] ?? null,
              radiation: hourly.shortwave_radiation?.[startIndex + offset] ?? null,
              
directRadiation: hourly.direct_radiation?.[startIndex + offset] ?? null,
diffuseRadiation: hourly.diffuse_radiation?.[startIndex + offset] ?? null,
directNormalIrradiance:
  hourly.direct_normal_irradiance?.[startIndex + offset] ?? null,

              wetBulb: hourly.wet_bulb_temperature_2m?.[startIndex + offset] ?? null,
            }))
            setForecast(hours)
            setForecastStatus(`Hourly forecast loaded · ${hours.length} time slots · Open-Meteo`)
          } else {
            setForecast([])
            setForecastStatus('Hourly forecast unavailable for this response')
          }
        }
      } catch {
        if (!cancelled) {
          setWeather(null)
          setForecast([])
          setForecastStatus('Forecast unavailable · Check your connection and retry')
          setWeatherError(true)
          setWeatherStatus('Live weather unavailable · Check your connection and retry')
        }
      }
    }

    setWeather(null)
    setForecast([])
    setForecastStatus('Loading hourly forecast…')
    setWeatherError(false)
    setWeatherStatus('Loading live weather…')
    loadWeather()

    const refreshInterval = setInterval(loadWeather, 10 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(refreshInterval)
    }
  }, [selectedCity.name, selectedCity.latitude, selectedCity.longitude])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">T</div>
          <div>
            <h2>THERMOCORTEX</h2>
            <span>HUMAN HEAT INTELLIGENCE</span>
          </div>
        </div>

        <p className="nav-heading">COMMAND CENTRE</p>

        <nav aria-label="Main navigation">
          {navigation.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activeTab === item ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item)
                if (item === 'Forecast timeline') {
                  document.getElementById('forecast-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              aria-current={activeTab === item ? 'page' : undefined}
            >
              <span aria-hidden="true">{index === 0 ? '◫' : '◇'}</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          Prototype mode
          <p>Weather observations are fetched from Open-Meteo when available. Risk scores and categories are illustrative only.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">CLIMATE INTELLIGENCE / INDIA</p>
            <h1>{activeTab}</h1>
            <p className="subtitle">Understand heat conditions. Prioritise human safety.</p>
          </div>

          <label className="city-select-label">
            <span className="sr-only">Select city</span>
            <select
              value={selectedCity.name}
              onChange={(event) => {
                const city = cities.find((item) => item.name === event.target.value)
                if (city) setSelectedCity(city)
              }}
              aria-label="Select city"
            >
              {cities.map((city) => (
                <option key={city.name} value={city.name}>{city.name}</option>
              ))}
            </select>
          </label>
        </header>

        <div className="demo-banner" role="note">
          <strong>PROTOTYPE DATA NOTICE</strong>
          <span>
            Weather observations are fetched live when available. Risk scores, categories, and regional comparisons are illustrative and are not validated health predictions.
          </span>
        </div>

        <section className="welcome-panel" aria-labelledby="regional-heading">
          <div>
            <p className="eyebrow">REGIONAL HEAT MONITOR</p>
            <h2 id="regional-heading">{selectedCity.name}</h2>
            <p>Explore current environmental observations and potential heat-stress concerns for this demonstration location.</p>
          </div>

          <div className="temperature" aria-live="polite">
            <span>Current temperature</span>
            <strong>{weather ? formatValue(weather.temperature_2m, '°C') : '—'}</strong>
            <span>Relative humidity: {weather ? formatValue(weather.relative_humidity_2m, '%') : '—'}</span>
            <span className={weatherError ? 'weather-status error' : 'weather-status'}>{weatherStatus}</span>
          </div>
        </section>

        <section className="stats-grid" aria-label="Current weather observations and prototype indicators">
          <article className="stat-card heat-index-card">
            <span>NOAA Heat Index</span>
            <strong>{heatIndex ? `${heatIndex.celsius.toFixed(1)}°C` : '—'}</strong>
            <p>{heatIndex ? 'Calculated from live temperature + humidity' : weather && Number(weather.temperature_2m) < 26.7 ? 'Not calculated: temperature is below the configured 80°F (26.7°C) threshold. This does not mean there is no heat risk.' : 'Not calculated: required temperature or humidity data is unavailable.'}</p>
          </article>

          <article className="stat-card heat-index-card">
            <span>Heat Index advisory category</span>
            <strong className={`risk-label ${heatIndex ? heatIndex.category.toLowerCase().replaceAll(' ', '-') : 'not-applicable'}`}>{heatIndex ? heatIndex.category : 'Not applicable'}</strong>
            <p>{heatIndex ? heatIndex.description : 'Use official local heat alerts and guidance'}</p>
          </article>

          <article className="stat-card">
            <span>Temperature</span>
            <strong>{weather ? formatValue(weather.temperature_2m, '°C') : '—'}</strong>
            <p>{weather ? 'Live observation · Open-Meteo' : 'Live data unavailable'}</p>
          </article>

          <article className="stat-card">
            <span>Relative humidity</span>
            <strong>{weather ? formatValue(weather.relative_humidity_2m, '%') : '—'}</strong>
            <p>{weather ? 'Live observation · Open-Meteo' : 'Live data unavailable'}</p>
          </article>

          <article className="stat-card">
            <span>Wind speed</span>
            <strong>{weather ? formatValue(weather.wind_speed_10m, ' km/h') : '—'}</strong>
            <p>{weather ? 'Live observation · Open-Meteo' : 'Live data unavailable'}</p>
          </article>

          <article className="stat-card">
            <span>UV Index</span>
            <strong>{weather ? formatValue(weather.uv_index == null ? null : Number(weather.uv_index).toFixed(1)) : '—'}</strong>
            <p>{weather ? 'Live observation · Open-Meteo' : 'Live data unavailable'}</p>
          </article>

          <article className="stat-card">
            <span>Solar radiation</span>
            <strong>{weather ? formatValue(weather.shortwave_radiation, ' W/m²') : '—'}</strong>
            <p>{weather ? 'Live observation · Open-Meteo' : 'Live data unavailable'}</p>
          </article>

          <article className="stat-card">
            <span>Apparent temperature</span>
            <strong>{weather ? formatValue(weather.apparent_temperature, '°C') : '—'}</strong>
            <p>{weather ? 'Live observation · Open-Meteo' : 'Live data unavailable'}</p>
          </article>

          <article className="stat-card">
            <span>Wet-bulb temperature</span>
            <strong>{weather ? formatValue(weather.wet_bulb_temperature_2m, '°C') : '—'}</strong>
            <p>{weather?.wet_bulb_temperature_2m != null ? 'Hourly Open-Meteo estimate · humidity-related heat indicator' : 'Hourly wet-bulb data unavailable'}</p>
          </article>
          
<article className="stat-card">
  <span>Python Backend</span>
  <strong>{backendStatus}</strong>
  <p>FastAPI · Local API · Port 8000</p>
</article>

        </section>

        <section className="panel forecast-panel" id="forecast-timeline" aria-labelledby="forecast-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEXT 12 HOURLY SLOTS</p>
              <h3 id="forecast-heading">Forecast timeline · {selectedCity.name}</h3>
              <p>Hourly environmental forecasts from Open-Meteo. These are weather forecasts, not validated heat-stress predictions.</p>
            </div>
            <span className={`panel-tag ${forecast.length ? 'forecast-live-tag' : ''}`}>{forecast.length ? 'FORECAST LOADED' : 'WAITING FOR DATA'}</span>
          </div>

          <div className="forecast-status" role="status">{forecastStatus}</div>

          {forecast.length > 0 ? (
            <div className="forecast-scroll">
              <div className="forecast-grid">
                {forecast.map((hour, index) => (
                  <article className={`forecast-card ${index === 0 ? 'forecast-current' : ''}`} key={hour.time}>
                    <span className="forecast-day">{formatForecastDay(hour.time, weather?.time)}</span>
                    <strong className="forecast-time">{formatHour(hour.time)}</strong>
                    <div className="forecast-temp">{formatValue(hour.temperature, '°C')}</div>
                    <div className="forecast-detail"><span>Feels like</span><strong>{formatValue(hour.apparent, '°C')}</strong></div>
                    <div className="forecast-detail"><span>Humidity</span><strong>{formatValue(hour.humidity, '%')}</strong></div>
                    <div className="forecast-detail"><span>Wind</span><strong>{formatValue(hour.wind, ' km/h')}</strong></div>
                    <div className="forecast-detail"><span>UV index</span><strong>{hour.uv == null ? '—' : Number(hour.uv).toFixed(1)}</strong></div>
                    <div className="forecast-detail"><span>Solar</span><strong>{formatValue(hour.radiation, ' W/m²')}</strong></div>
                    <div className="forecast-detail"><span>Wet bulb</span><strong>{formatValue(hour.wetBulb, '°C')}</strong></div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="forecast-empty">
              <span className="forecast-empty-icon" aria-hidden="true">◷</span>
              <div>
                <strong>Hourly forecast will appear here</strong>
                <p>Choose a city and wait for the Open-Meteo response. If the API is unavailable, the dashboard will not substitute invented forecast values.</p>
              </div>
            </div>
          )}
          <p className="forecast-disclaimer">Forecast values can change as new model runs become available. Use official local alerts for safety decisions; THERMOCORTEX does not currently calculate a validated thermal-stress index.</p>
        </section>

        <section className="lower-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <h3>Regional risk overview</h3>
                <p>Illustrative comparison only · Not validated risk scores.</p>
              </div>
              <span className="panel-tag">DEMO</span>
            </div>

            <div className="city-list">
              {cities.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  className={`city-row ${selectedCity.name === city.name ? 'city-selected' : ''}`}
                  onClick={() => setSelectedCity(city)}
                  aria-pressed={selectedCity.name === city.name}
                >
                  <span className="city-name">{city.name}</span>
                  <span className="city-bar" aria-hidden="true"><span style={{ width: `${city.score}%` }} /></span>
                  <strong>{city.score}</strong>
                  <span className={`category ${city.risk.toLowerCase()}`}>{city.risk}</span>
                </button>
              ))}
            </div>

            <p className="map-note">Schematic comparison using placeholder values. This is not a geographic risk map or a validated ranking.</p>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h3>Recommended precautions</h3>
                <p>General precautions during extreme heat</p>
              </div>
            </div>

            <div className="action-item">
              <span>01</span>
              <div>
                <strong>Reduce peak-hour exposure</strong>
                <p>Review strenuous outdoor activity during the hottest hours.</p>
              </div>
            </div>

            <div className="action-item">
              <span>02</span>
              <div>
                <strong>Plan hydration and rest</strong>
                <p>Provide drinking water, shade, and suitable rest breaks.</p>
              </div>
            </div>

            <div className="action-item">
              <span>03</span>
              <div>
                <strong>Check on vulnerable people</strong>
                <p>Follow local public-health guidance and official heat alerts.</p>
              </div>
            </div>
          </article>
        </section>

        <section className="panel method-panel" aria-labelledby="method-heading">
          <div className="panel-heading">
            <div>
              <h3 id="method-heading">Method &amp; data</h3>
              <p>What the prototype currently does — and what still needs to be built</p>
            </div>
            <span className="panel-tag">TRANSPARENCY</span>
          </div>

          <div className="method-grid">
            <article className="method-card">
              <div className="method-card-top">
                <span className="method-icon" aria-hidden="true">◉</span>
                <span className="method-status status-live">CONNECTED WHEN AVAILABLE</span>
              </div>
              <h3>Weather observations</h3>
              <p>Requests current temperature, relative humidity, apparent temperature, wind speed, UV index and shortwave radiation from Open-Meteo. Hourly data also supplies wet-bulb temperature.</p>
              <div className="method-card-footer">
                <span>Source</span>
                <strong>Open-Meteo API</strong>
              </div>
            </article>

            <article className="method-card">
              <div className="method-card-top">
                <span className="method-icon" aria-hidden="true">⌁</span>
                <span className="method-status status-live">INITIAL METRIC IMPLEMENTED</span>
              </div>
              <h3>NOAA Heat Index + wet-bulb temperature</h3>
              <p>NOAA Heat Index uses air temperature and relative humidity when temperature is at least 80°F (26.7°C). Wet-bulb temperature is shown as a separate humidity-related indicator from Open-Meteo hourly data. Neither value alone is a complete outdoor thermal-stress model.</p>
              <div className="method-card-footer">
                <span>Indicators</span>
                <strong>Heat Index · Wet bulb</strong>
              </div>
            </article>

            <article className="method-card">
              <div className="method-card-top">
                <span className="method-icon" aria-hidden="true">▤</span>
                <span className="method-status status-demo">DEMONSTRATION</span>
              </div>
              <h3>Regional risk comparison</h3>
              <p>City scores and labels are fixed demonstration values. They do not update from the weather API and must not be interpreted as live risk levels or used for health decisions.</p>
              <div className="method-card-footer">
                <span>Data type</span>
                <strong>Static placeholders</strong>
              </div>
            </article>

            <article className="method-card">
              <div className="method-card-top">
                <span className="method-icon" aria-hidden="true">↗</span>
                <span className="method-status status-pending">NEXT DEVELOPMENT STEP</span>
              </div>
              <h3>Next validation steps</h3>
              <p>Next, implement and validate a documented outdoor metric that accounts for air temperature, humidity, wind and solar exposure. Wet-bulb temperature is an additional indicator only; it must not be presented as a complete heat-stress score.</p>
              <div className="method-card-footer">
                <span>Planned work</span>
                <strong>Validated outdoor metric · Reference tests</strong>
              </div>
            </article>
          </div>

          <div className="method-note" role="note">
            <span className="method-note-icon" aria-hidden="true">!</span>
            <div>
              <strong>Important limitation</strong>
              <p>The NOAA Heat Index uses air temperature and relative humidity and assumes shade and light wind. Wet-bulb temperature is displayed separately and is not a complete outdoor thermal-stress index. Neither indicator alone directly captures all effects of solar radiation, wind, clothing, activity, or personal health. Follow official local heat alerts and public-health guidance.</p>
            </div>
          </div>
        </section>

        <footer>THERMOCORTEX · SIH 2026 · Prototype under development</footer>
      </main>
    </div>
  )
}

export default App
