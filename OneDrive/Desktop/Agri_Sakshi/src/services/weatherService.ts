// weather.service.ts
export interface CurrentWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  visibility: number;
  uvIndex: number;
  condition: string;
  location: string;
  observationTime: string;
}

export interface WeatherForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
}

export interface WeatherAdvisory {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  validFrom: string;
  validTo: string;
  district: string;
  category: string;
}

export class WeatherService {
  // ---- Open-Meteo config (no key required) ----
  private static readonly OM_BASE = 'https://api.open-meteo.com/v1/forecast';
  private static readonly DEFAULT_QUERY = {
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'auto',
  };

  // ---------- PUBLIC API ----------

  /** Live current weather from Open-Meteo's `current` block. */
  static async getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
    const url = new URL(this.OM_BASE);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      [
        'temperature_2m',
        'relative_humidity_2m',
        'rain',
        'showers',
        'precipitation',
        'wind_speed_10m',
        'wind_direction_10m',
        'pressure_msl',
        'visibility',
        'uv_index',
        'weather_code',
        'cloud_cover',
      ].join(',')
    );
    for (const [k, v] of Object.entries(this.DEFAULT_QUERY)) url.searchParams.set(k, String(v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Open-Meteo current fetch failed: ${res.statusText}`);
    const data = await res.json();

    const c = data.current || {};
    const loc = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const conditionText = this.wmoToText(c.weather_code);

    return {
      temperature: this.num(c.temperature_2m),
      humidity: this.num(c.relative_humidity_2m),
      rainfall: this.num(c.precipitation ?? (this.num(c.rain) + this.num(c.showers))),
      windSpeed: this.num(c.wind_speed_10m),
      windDirection: this.degToCompass(this.num(c.wind_direction_10m)),
      pressure: this.num(c.pressure_msl),
      visibility: Math.round(this.num(c.visibility) / 1000),
      uvIndex: this.num(c.uv_index),
      condition: conditionText,
      location: loc,
      observationTime: c.time || new Date().toISOString(),
    };
  }

  /** Daily forecast (7 days default) via Open-Meteo `daily` block. */
  static async getWeatherForecast(lat: number, lon: number, days: number = 7): Promise<WeatherForecast[]> {
    const url = new URL(this.OM_BASE);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'daily',
      [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'weather_code',
        'relative_humidity_2m_mean',
      ].join(',')
    );
    for (const [k, v] of Object.entries(this.DEFAULT_QUERY)) url.searchParams.set(k, String(v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Open-Meteo forecast fetch failed: ${res.statusText}`);
    const data = await res.json();

    const d = data.daily || {};
    const n = Math.min(days, (d.time || []).length);
    const out: WeatherForecast[] = [];

    for (let i = 0; i < n; i++) {
      const date = d.time[i];
      const wcode = (d.weather_code || [])[i];
      const condition = this.wmoToText(wcode);

      out.push({
        date,
        maxTemp: this.num((d.temperature_2m_max || [])[i]),
        minTemp: this.num((d.temperature_2m_min || [])[i]),
        rainfall: this.num((d.precipitation_sum || [])[i]),
        humidity: this.num((d.relative_humidity_2m_mean || [])[i]),
        windSpeed: this.num((d.wind_speed_10m_max || [])[i]),
        condition,
        icon: this.getWeatherIcon(this.conditionToIcon(condition)),
      });
    }

    if (!out.length) throw new Error('Open-Meteo daily forecast response was empty');
    return out;
  }

  /**
   * Generate weather advisories from real forecast data using lat/lon.
   * Now fully implemented — no longer returns empty array.
   * Call this with the user's current lat/lon from locationService.
   */
  static async getWeatherAdvisories(
    district: string,
    lat?: number,
    lon?: number
  ): Promise<WeatherAdvisory[]> {
    // Default to Hyderabad if no coordinates provided
    const useLat = lat ?? 17.385;
    const useLon = lon ?? 78.4867;

    let forecast: WeatherForecast[] = [];
    try {
      forecast = await this.getWeatherForecast(useLat, useLon, 5);
    } catch {
      return []; // Can't generate advisories without forecast
    }

    const adv: WeatherAdvisory[] = [];

    forecast.forEach((d) => {
      const nextDay = new Date(d.date);
      nextDay.setDate(nextDay.getDate() + 1);
      const validTo = nextDay.toISOString().split('T')[0];

      // Heavy rainfall — disrupts field operations, disease risk
      if (d.rainfall >= 50) {
        adv.push(
          this.mkAdv(
            'Heavy Rainfall Advisory',
            'high',
            district,
            d.date,
            validTo,
            'Heavy rainfall expected. Postpone spraying and fertilizer application. Ensure field drainage is clear to prevent waterlogging. Hold off on harvesting if crops are mature.',
            'rainfall'
          )
        );
      } else if (d.rainfall >= 20) {
        adv.push(
          this.mkAdv(
            'Moderate Rainfall Advisory',
            'low',
            district,
            d.date,
            validTo,
            'Moderate rain expected. Good for standing crops. Avoid pesticide spraying 24 hours before and after rainfall for effectiveness.',
            'rainfall'
          )
        );
      }

      // Heat stress — crop damage above 40°C
      if (d.maxTemp >= 42) {
        adv.push(
          this.mkAdv(
            'Extreme Heat Advisory',
            'extreme',
            district,
            d.date,
            validTo,
            `Extreme heat (${d.maxTemp}°C) forecast. Water crops in early morning or evening only. Avoid field work between 11AM–3PM. Apply mulch to retain soil moisture. Vegetable crops may need shade nets.`,
            'temperature'
          )
        );
      } else if (d.maxTemp >= 38) {
        adv.push(
          this.mkAdv(
            'Heat Stress Advisory',
            'medium',
            district,
            d.date,
            validTo,
            `High temperature (${d.maxTemp}°C) expected. Ensure adequate irrigation. Consider extra watering for vegetables and fruit crops. Monitor for wilting.`,
            'temperature'
          )
        );
      }

      // Strong winds — damage to crops, spraying not advisable
      if (d.windSpeed >= 60) {
        adv.push(
          this.mkAdv(
            'Strong Wind Advisory',
            'high',
            district,
            d.date,
            validTo,
            `Strong winds (${d.windSpeed} km/h) expected. Do not spray pesticides or fertilizers. Stake tall crops like maize and sorghum. Secure greenhouse covers and shade nets.`,
            'wind'
          )
        );
      } else if (d.windSpeed >= 40) {
        adv.push(
          this.mkAdv(
            'Moderate Wind Advisory',
            'low',
            district,
            d.date,
            validTo,
            `Moderate winds (${d.windSpeed} km/h) expected. Avoid spraying operations. Check stakes and supports on tall crops.`,
            'wind'
          )
        );
      }

      // High humidity — fungal disease risk
      if (d.humidity >= 85 && d.maxTemp >= 28) {
        adv.push(
          this.mkAdv(
            'High Humidity — Disease Risk',
            'medium',
            district,
            d.date,
            validTo,
            `High humidity (${d.humidity}%) combined with warm temperatures creates ideal conditions for fungal diseases (blast, blight, mildew). Inspect crops and consider preventive fungicide if disease pressure is high.`,
            'disease_risk'
          )
        );
      }

      // Cold night risk (winter)
      if (d.minTemp <= 5) {
        adv.push(
          this.mkAdv(
            'Cold Wave Advisory',
            'high',
            district,
            d.date,
            validTo,
            `Very low minimum temperature (${d.minTemp}°C) expected tonight. Cover sensitive nurseries and vegetables. Irrigate lightly in the evening — moist soil retains heat better. Delay transplanting until temperatures rise.`,
            'temperature'
          )
        );
      }
    });

    // Deduplicate — keep at most one advisory per category per day
    const seen = new Set<string>();
    return adv.filter((a) => {
      const key = `${a.validFrom}:${a.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Keep your existing icon map
  static getWeatherIcon(condition: string): string {
    const iconMap: { [key: string]: string } = {
      sunny: '☀️',
      clear: '🌤️',
      'partly-cloudy': '⛅',
      cloudy: '☁️',
      rainy: '🌧️',
      stormy: '⛈️',
      foggy: '🌫️',
    };
    return iconMap[condition] || '🌤️';
  }

  static async getSeasonalTrends(lat: number, lon: number): Promise<any> {
    return {
      monthly: {
        temperature: [25, 28, 32, 35, 38, 36, 32, 31, 30, 28, 26, 24],
        rainfall: [10, 15, 25, 45, 85, 120, 150, 140, 100, 60, 25, 12],
      },
      seasonal: {
        summer: { avgTemp: 35, totalRainfall: 80 },
        monsoon: { avgTemp: 30, totalRainfall: 600 },
        winter: { avgTemp: 20, totalRainfall: 30 },
      },
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private static mkAdv(
    title: string,
    severity: WeatherAdvisory['severity'],
    district: string,
    validFrom: string,
    validTo: string,
    message: string,
    category: string
  ): WeatherAdvisory {
    return {
      id: `${category}-${validFrom}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      message,
      severity,
      validFrom,
      validTo,
      district,
      category,
    };
  }

  private static num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
  }

  private static degToCompass(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  private static conditionToIcon(condition: string): string {
    const c = condition.toLowerCase();
    if (c.includes('storm') || c.includes('thunder')) return 'stormy';
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rainy';
    if (c.includes('fog') || c.includes('mist')) return 'foggy';
    if (c.includes('cloud')) return c.includes('partly') ? 'partly-cloudy' : 'cloudy';
    if (c.includes('clear') || c.includes('sunny')) return 'clear';
    return 'sunny';
  }

  /** WMO weather code → readable text */
  private static wmoToText(code: number): string {
    if (code === 0) return 'Clear sky';
    if (code <= 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code <= 49) return 'Foggy';
    if (code <= 59) return 'Drizzle';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 84) return 'Snow showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  }
}
