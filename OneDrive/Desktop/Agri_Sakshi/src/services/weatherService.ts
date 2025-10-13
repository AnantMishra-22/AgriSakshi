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
  // Units & timezone tuned for India usage; adjust as needed
  private static readonly DEFAULT_QUERY = {
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'auto',
  };

  // ---------- PUBLIC API ----------

  /** Live current weather from Open-Meteo’s `current` block. */
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
      // precipitation is mm over last hour; include rain+showers if provided
      rainfall: this.num(c.precipitation ?? (this.num(c.rain) + this.num(c.showers))),
      windSpeed: this.num(c.wind_speed_10m),
      windDirection: this.degToCompass(this.num(c.wind_direction_10m)),
      pressure: this.num(c.pressure_msl),
      visibility: Math.round(this.num(c.visibility) / 1000), // meters → km (rounded)
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
   * Open-Meteo does not provide official advisories.
   * This generates **derived advisories** from forecast thresholds so your UI keeps working.
   * Tune thresholds per your crop logic.
   */
  static async getWeatherAdvisories(district: string): Promise<WeatherAdvisory[]> {
    // You can enhance this by passing lat/lon for district and calling getWeatherForecast()
    // For now, return an empty array to be safe OR uncomment the “derived” logic below.
    return [];
    /*
    const latLon = await this.lookupDistrictLatLon(district); // implement if needed
    const fc = await this.getWeatherForecast(latLon.lat, latLon.lon, 5);

    const adv: WeatherAdvisory[] = [];
    fc.forEach((d, idx) => {
      // simple examples — adjust for your domain
      if (d.rainfall >= 50) {
        adv.push(this.mkAdv('Heavy Rainfall Advisory', 'high', district, d.date,
          'Heavy rainfall expected. Postpone spraying and ensure drainage.'));
      } else if (d.maxTemp >= 40) {
        adv.push(this.mkAdv('Heat Stress Advisory', 'medium', district, d.date,
          'High temperature likely. Ensure adequate irrigation and mulch where possible.'));
      } else if (d.windSpeed >= 50) {
        adv.push(this.mkAdv('Strong Wind Advisory', 'medium', district, d.date,
          'Strong winds likely. Secure structures and avoid spraying.'));
      }
    });
    return adv;
    */
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

  // Optional: keep your seasonal trends mock (unchanged)
  static async getSeasonalTrends(lat: number, lon: number): Promise<any> {
    return {
      monthly: {
        temperature: [25, 28, 32, 35, 38, 36, 32, 31, 30, 28, 26, 24],
        rainfall: [10, 15, 25, 45, 85, 120, 150, 140, 100, 60, 25, 12],
      },
      seasonal: {
        summer: { avgTemp: 35, totalRainfall: 80 },
        monsoon: { avgTemp: 30, totalRainfall: 400 },
        winter: { avgTemp: 22, totalRainfall: 35 },
      },
    };
  }

  // ---------- Helpers ----------

  private static num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private static degToCompass(deg: number): string {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const ix = Math.round(deg / 22.5) % 16;
    return dirs[(ix + 16) % 16];
  }

  private static conditionToIcon(cond: string): string {
    const c = cond.toLowerCase();
    if (c.includes('thunder')) return 'stormy';
    if (c.includes('rain') || c.includes('drizzle')) return 'rainy';
    if (c.includes('snow')) return 'cloudy';
    if (c.includes('cloud')) return 'cloudy';
    if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'foggy';
    if (c.includes('clear') || c.includes('sun')) return 'sunny';
    return 'clear';
  }

  /** Map WMO weather codes to readable text. */
  private static wmoToText(code: number): string {
    // https://open-meteo.com/en/docs#weathervariables - WMO weather codes
    const m: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    return m[Number(code)] ?? '—';
  }

  // If you decide to generate derived advisories, this helper is handy
  private static mkAdv(
    title: string,
    severity: 'low' | 'medium' | 'high' | 'extreme',
    district: string,
    date: string,
    message: string
  ): WeatherAdvisory {
    const start = new Date(date + 'T00:00:00');
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    return {
      id: `${title}-${district}-${date}`,
      title,
      message,
      severity,
      validFrom: start.toISOString(),
      validTo: end.toISOString(),
      district,
      category: 'Derived',
    };
  }
}
