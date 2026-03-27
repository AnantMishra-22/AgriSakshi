// recommendationService.ts
// AI-powered crop recommendation engine that synthesises:
//   1. Location-based soil data (type, pH, NPK, texture, drainage)
//   2. Real-time weather from Open-Meteo API (temperature, humidity, rainfall)
//   3. Chemical test results from camera analysis (chloride, nitrate, phosphorus)
// Uses Claude API for intelligent recommendations, with deterministic fallback.

import { Crop, crops } from '../data/crops';
import { SoilData } from './soilService';
import { CurrentWeather, WeatherForecast } from './weatherService';

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface ChemicalTestData {
  chloride?:   { concentration: number; unit: string; status: string };
  nitrate?:    { concentration: number; unit: string; status: string };
  phosphorus?: { concentration: number; unit: string; status: string };
}

// Array form used by SoilTab's ChemicalTestPanel — same data, different shape
export interface ChemicalTestResult {
  test:          'chloride' | 'nitrate' | 'phosphorus';
  concentration: number;
  unit:          string;
  status:        string;
}

/** Convert the array form from SoilTab into the map form used by the recommendation engine */
export function chemicalResultsToData(results: ChemicalTestResult[]): ChemicalTestData {
  const data: ChemicalTestData = {};
  for (const r of results) {
    data[r.test] = { concentration: r.concentration, unit: r.unit, status: r.status };
  }
  return data;
}

export interface CropRecommendation {
  crop: Crop;
  score: number;
  rationale: string[];
  expectedYield: string;
  profitHint: string;
  sowingWindow: string;
  harvestWindow: string;
  risks: string[];
  advantages: string[];
  irrigationNeeds: string;
}

export interface RecommendationResult {
  bestCrop: CropRecommendation | null;
  topCrops: CropRecommendation[];
  seasonalRecommendations: { [season: string]: CropRecommendation[] };
  aiNarrative?: string;
  chemicalInsights?: string;
  dataQuality?: {
    hasChemical: boolean;
    hasWeather:  boolean;
    hasSoil:     boolean;
    hasLocation: boolean;
  };
}

// ─── Result cache ─────────────────────────────────────────────────────────────

interface CachedResult {
  result: RecommendationResult;
  cacheKey: string;
  fetchedAt: number;
}

let _cache: CachedResult | null = null;
const CACHE_TTL_MS = 12 * 60 * 1000; // 12 minutes

function makeCacheKey(
  soil: SoilData | null,
  weather: CurrentWeather | null,
  forecast: WeatherForecast[],
  location: { latitude: number; longitude: number; state?: string } | null,
  chemical: ChemicalTestData | null
): string {
  const m = new Date().getMonth();
  const s = soil ? [soil.type, soil.pH, soil.nitrogen, soil.phosphorous, soil.potassium].join('|') : 'X';
  const w = weather ? [Math.round(weather.temperature), Math.round(weather.humidity)].join('|') : 'X';
  const f = forecast.length ? [Math.round(forecast[0]?.maxTemp ?? 0), forecast.length].join('|') : 'X';
  const l = location ? [Math.round(location.latitude * 10), Math.round(location.longitude * 10)].join('|') : 'X';
  const c = chemical
    ? 'cl' + Math.round(chemical.chloride?.concentration ?? -1) +
      '|no' + Math.round(chemical.nitrate?.concentration ?? -1) +
      '|ph' + Math.round(chemical.phosphorus?.concentration ?? -1)
    : 'X';
  return [m, s, w, f, l, c].join('||');
}

// ─── Claude API helper ────────────────────────────────────────────────────────

async function callClaude(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error('Claude ' + res.status);
  const data = await res.json();
  return data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => (b.text as string))
    .join('')
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim();
}

// ─── Context string for the model ────────────────────────────────────────────

function contextSummary(
  soil: SoilData | null,
  weather: CurrentWeather | null,
  forecast: WeatherForecast[],
  location: { latitude: number; longitude: number; state?: string } | null,
  chemical: ChemicalTestData | null
): string {
  const mon = new Date().toLocaleString('en-IN', { month: 'long' });
  const yr  = new Date().getFullYear();
  const m   = new Date().getMonth() + 1;
  const season = m >= 6 && m <= 10 ? 'Kharif' : m >= 11 || m <= 3 ? 'Rabi' : 'Zaid';
  const lines: string[] = ['Date: ' + mon + ' ' + yr + ', Season: ' + season];

  if (location) {
    lines.push('Location: ' + (location.state ?? 'India') + ' (' + location.latitude.toFixed(2) + 'N, ' + location.longitude.toFixed(2) + 'E)');
  }

  if (soil) {
    lines.push(
      'Soil: ' + soil.type + ', pH ' + soil.pH +
      ', N ' + soil.nitrogen + ' kg/ha' +
      ', P ' + soil.phosphorous + ' kg/ha' +
      ', K ' + soil.potassium + ' kg/ha' +
      ', OM ' + soil.organicMatter + '%' +
      ', ' + soil.texture + ' texture' +
      ', ' + soil.drainage + ' drainage' +
      ', ' + soil.salinity + ' salinity'
    );
  } else {
    lines.push('Soil: not available');
  }

  if (weather) {
    const avgMax = forecast.length
      ? (forecast.reduce((s, d) => s + d.maxTemp, 0) / forecast.length).toFixed(1)
      : weather.temperature.toFixed(1);
    const rain7 = forecast.length
      ? forecast.reduce((s, d) => s + d.rainfall, 0).toFixed(1)
      : '0';
    lines.push(
      'Weather: ' + weather.temperature + 'C now, humidity ' + weather.humidity + '%, ' +
      'condition "' + weather.condition + '", ' +
      '7-day avg max ' + avgMax + 'C, 7-day total rain ' + rain7 + ' mm'
    );
  } else {
    lines.push('Weather: not available');
  }

  if (chemical) {
    const parts: string[] = [];
    if (chemical.chloride)   parts.push('Cl ' + chemical.chloride.concentration + ' ' + chemical.chloride.unit + ' [' + chemical.chloride.status + ']');
    if (chemical.nitrate)    parts.push('NO3 ' + chemical.nitrate.concentration + ' ' + chemical.nitrate.unit + ' [' + chemical.nitrate.status + ']');
    if (chemical.phosphorus) parts.push('PO4 ' + chemical.phosphorus.concentration + ' ' + chemical.phosphorus.unit + ' [' + chemical.phosphorus.status + ']');
    if (parts.length) lines.push('Chemical tests: ' + parts.join('; '));
  } else {
    lines.push('Chemical tests: not performed');
  }

  return lines.join('\n');
}

// ─── AI score fetch ───────────────────────────────────────────────────────────

interface AIBatch {
  scores: Record<string, number>;
  aiNarrative: string;
  chemicalInsights: string;
}

async function fetchAIScores(context: string, cropIds: string[]): Promise<AIBatch> {
  const system =
    'You are AgriSakshi, an expert Indian agricultural advisor. ' +
    'Respond ONLY with valid JSON — no markdown, no code fences, no explanation.';

  const user =
    'Farm conditions:\n' + context + '\n\n' +
    'Score each crop suitability 0-100. Consider: soil type & pH fit, NPK levels, ' +
    'temperature match, rainfall adequacy, season alignment, chemical test results ' +
    '(deficient N/P lowers nitrogen/phosphorus-hungry crops; excess Cl penalises salt-sensitive crops), ' +
    'and Indian market viability.\n\n' +
    'Crops to score: ' + cropIds.join(', ') + '\n\n' +
    'Also provide:\n' +
    '- "aiNarrative": 2-sentence plain English summary of conditions and best strategy.\n' +
    '- "chemicalInsights": 1 sentence about chemical test findings, or empty string if no tests.\n\n' +
    'Return ONLY this JSON (no other keys):\n' +
    '{"scores":{"rice":72,"wheat":85,...},"aiNarrative":"...","chemicalInsights":"..."}';

  const raw    = await callClaude(system, user);
  const parsed = JSON.parse(raw) as AIBatch;

  for (const k of Object.keys(parsed.scores ?? {})) {
    const v = Number(parsed.scores[k]);
    parsed.scores[k] = Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 50;
  }
  return parsed;
}

// ─── Deterministic fallback scorer ───────────────────────────────────────────

function c01(x: number): number { return Math.max(0, Math.min(1, x)); }
function near(v: number, lo: number, hi: number, slack: number): number {
  const mid = (lo + hi) / 2;
  const r   = (hi - lo) / 2 + slack;
  return r <= 0 ? (v === mid ? 1 : 0) : c01(1 - Math.abs(v - mid) / r);
}

function deterministicScore(
  crop: Crop,
  soil: SoilData | null,
  weather: CurrentWeather | null,
  forecast: WeatherForecast[],
  chemical: ChemicalTestData | null
): number {
  const meanT = forecast.length
    ? forecast.reduce((s, d) => s + (d.maxTemp + d.minTemp) / 2, 0) / forecast.length
    : (weather ? weather.temperature : 28);

  const rainCm = forecast.reduce((s, d) => s + (d.rainfall || 0), 0) / 10;

  const tFit = near(meanT, crop.ideal_temp[0], crop.ideal_temp[1], 4);
  const rFit = near(rainCm, crop.rainfall_need[0] / 12, crop.rainfall_need[1] / 12, 1);
  const pFit = soil ? near(soil.pH, crop.pH[0], crop.pH[1], 0.5) : 0.7;

  let sFit = 0.65;
  if (soil) {
    const hit = crop.soil_ok.some(function(s) {
      return s.toLowerCase().indexOf(soil.type.toLowerCase().split(' ')[0]) >= 0 ||
             soil.type.toLowerCase().indexOf(s.toLowerCase()) >= 0;
    });
    sFit = hit ? 1.0 : 0.55;
  }

  const m   = new Date().getMonth() + 1;
  const sea = m >= 6 && m <= 10 ? 'kharif' : m >= 11 || m <= 3 ? 'rabi' : 'summer';
  const seaFit =
    crop.seasonality.indexOf(sea) >= 0 ||
    crop.seasonality.indexOf('annual') >= 0 ||
    crop.seasonality.indexOf('perennial') >= 0 ? 1.0 : 0.4;

  let chemMod = 1.0;
  if (chemical && chemical.nitrate &&
      (chemical.nitrate.status === 'deficient' || chemical.nitrate.status === 'low')) {
    if (['rice','maize','sugarcane','wheat','cotton'].indexOf(crop.id) >= 0) chemMod *= 0.85;
  }
  if (chemical && chemical.phosphorus && chemical.phosphorus.status === 'deficient') {
    chemMod *= 0.88;
  }
  if (chemical && chemical.chloride && chemical.chloride.status === 'excess') {
    if (['potato','tomato','beans','strawberry'].indexOf(crop.id) >= 0) chemMod *= 0.80;
  }

  const profW = crop.profit_potential === 'high' ? 1.05 : crop.profit_potential === 'low' ? 0.95 : 1.0;
  const blend = (0.25*tFit + 0.25*rFit + 0.20*sFit + 0.15*pFit + 0.15*seaFit) * profW * chemMod;
  return Math.min(100, Math.max(0, Math.round(blend * 100)));
}

// ─── Recommendation object builder ───────────────────────────────────────────

function buildRec(
  crop: Crop,
  score: number,
  soil: SoilData | null,
  weather: CurrentWeather | null,
  forecast: WeatherForecast[],
  chemical: ChemicalTestData | null
): CropRecommendation {
  const adv: string[] = [];
  const rsk: string[] = [];
  const rat: string[] = [];

  const meanT = forecast.length
    ? forecast.reduce((s, d) => s + (d.maxTemp + d.minTemp) / 2, 0) / forecast.length
    : (weather ? weather.temperature : 28);

  if (meanT >= crop.ideal_temp[0] && meanT <= crop.ideal_temp[1]) {
    adv.push('Forecast temperature ' + meanT.toFixed(0) + 'C is ideal');
  } else {
    rsk.push('Temperature ' + meanT.toFixed(0) + 'C outside ideal range ' + crop.ideal_temp[0] + '-' + crop.ideal_temp[1] + 'C');
  }

  const rainMm = forecast.reduce((s, d) => s + (d.rainfall || 0), 0);
  if (rainMm > 5) adv.push(rainMm.toFixed(0) + ' mm rain forecast this week');
  else rsk.push('Low rainfall this week — plan irrigation');

  if (soil) {
    const soilHit = crop.soil_ok.some(function(s) {
      return s.toLowerCase().indexOf(soil.type.toLowerCase().split(' ')[0]) >= 0 ||
             soil.type.toLowerCase().indexOf(s.toLowerCase()) >= 0;
    });
    if (soilHit) adv.push(soil.type + ' soil is well-suited');
    else rsk.push(soil.type + ' soil not ideal — consider amendments');

    if (soil.pH >= crop.pH[0] && soil.pH <= crop.pH[1]) {
      adv.push('Soil pH ' + soil.pH + ' within optimal range (' + crop.pH[0] + '-' + crop.pH[1] + ')');
    } else {
      rsk.push('Soil pH ' + soil.pH + ' outside optimal (' + crop.pH[0] + '-' + crop.pH[1] + ')');
    }

    if (soil.nitrogen < 200) rsk.push('Low soil N — apply nitrogen before sowing');
    else adv.push('Adequate soil nitrogen (' + soil.nitrogen + ' kg/ha)');

    if (soil.phosphorous < 20) rsk.push('Low soil P — apply DAP at sowing');
    else adv.push('Adequate soil phosphorus (' + soil.phosphorous + ' kg/ha)');
  }

  if (chemical) {
    if (chemical.nitrate) {
      const st = chemical.nitrate.status;
      if (st === 'optimal') adv.push('Nitrate test optimal (' + chemical.nitrate.concentration + ' mg/L)');
      else if (st === 'deficient' || st === 'low') rsk.push('Nitrate low (' + chemical.nitrate.concentration + ' mg/L) — apply N fertilizer');
      else if (st === 'excess') rsk.push('Excess nitrate — leaching risk, reduce N inputs');
    }
    if (chemical.phosphorus) {
      const st = chemical.phosphorus.status;
      if (st === 'optimal') adv.push('Phosphorus test optimal (' + chemical.phosphorus.concentration + ' mg/kg)');
      else if (st === 'deficient' || st === 'low') rsk.push('Low phosphorus (' + chemical.phosphorus.concentration + ' mg/kg) — apply SSP/DAP');
    }
    if (chemical.chloride) {
      if (chemical.chloride.status === 'excess') rsk.push('Excess chloride (' + chemical.chloride.concentration + ' mg/L) — leach before sowing');
      else if (chemical.chloride.status === 'optimal') adv.push('Chloride levels acceptable');
    }
  }

  const mo = new Date().getMonth() + 1;
  const sea = mo >= 6 && mo <= 10 ? 'kharif' : mo >= 11 || mo <= 3 ? 'rabi' : 'summer';
  if (crop.seasonality.indexOf(sea) >= 0) adv.push('Right season (' + sea + ') for this crop');
  else rsk.push('Off-season — best in ' + crop.seasonality.join('/'));

  if (crop.profit_potential === 'high') adv.push('High profit potential in current market');

  rat.push(
    score >= 80 ? 'Excellent match (' + score + '%) for your current field conditions.' :
    score >= 60 ? 'Good match (' + score + '%) with some manageable constraints.' :
                  'Moderate suitability (' + score + '%) — requires careful management.'
  );

  const now  = new Date();
  const fmt  = function(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  const sowE = new Date(now.getTime() + 14 * 86400000);
  const hS   = new Date(now.getTime() + ((crop.duration_days[0]) || 90) * 86400000);
  const hE   = new Date(now.getTime() + ((crop.duration_days[1]) || 120) * 86400000);

  return {
    crop,
    score,
    rationale: rat,
    expectedYield:
      score >= 85 ? crop.yield_potential :
      score >= 65 ? '~70% of max: ' + crop.yield_potential :
                    '~50% of max: ' + crop.yield_potential,
    profitHint:
      crop.profit_potential === 'high'   ? 'Strong demand and pricing expected' :
      crop.profit_potential === 'medium' ? 'Stable returns with moderate risk'  :
                                           'Reliable staple with lower margins',
    sowingWindow:  fmt(now) + ' to ' + fmt(sowE),
    harvestWindow: fmt(hS)  + ' to ' + fmt(hE),
    risks:      rsk,
    advantages: adv,
    irrigationNeeds: crop.irrigation_notes,
  };
}

// ─── Public service class ─────────────────────────────────────────────────────

export class RecommendationService {
  static async generateRecommendations(
    soilData:       SoilData | null,
    currentWeather: CurrentWeather | null,
    forecast:       WeatherForecast[],
    location:       { latitude: number; longitude: number; state?: string } | null,
    chemical?:      ChemicalTestData | null
  ): Promise<RecommendationResult> {
    const chem = chemical || null;

    const dataQuality = {
      hasChemical: !!(chem && (chem.chloride || chem.nitrate || chem.phosphorus)),
      hasWeather:  !!currentWeather,
      hasSoil:     !!soilData,
      hasLocation: !!location,
    };

    const key = makeCacheKey(soilData, currentWeather, forecast, location, chem);
    if (_cache && _cache.cacheKey === key && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
      return _cache.result;
    }

    const cropIds = crops.map(function(c) { return c.id; });
    let scores: Record<string, number> = {};
    let aiNarrative      = '';
    let chemicalInsights = '';

    if (dataQuality.hasWeather || dataQuality.hasSoil) {
      try {
        const ctx = contextSummary(soilData, currentWeather, forecast, location, chem);
        const ai  = await fetchAIScores(ctx, cropIds);
        scores           = ai.scores;
        aiNarrative      = ai.aiNarrative || '';
        chemicalInsights = ai.chemicalInsights || '';
      } catch (err) {
        console.warn('[RecommendationService] Claude API unavailable, using local scorer:', err);
      }
    }

    for (const crop of crops) {
      if (!Number.isFinite(scores[crop.id])) {
        scores[crop.id] = deterministicScore(crop, soilData, currentWeather, forecast, chem);
      }
    }

    const recs: CropRecommendation[] = crops
      .map(function(crop) {
        return buildRec(crop, scores[crop.id] || 50, soilData, currentWeather, forecast, chem);
      })
      .sort(function(a, b) { return b.score - a.score; });

    const seasonalRecommendations: Record<string, CropRecommendation[]> = {
      kharif: [], rabi: [], zaid: [], annual: [], perennial: [],
    };
    for (const rec of recs) {
      for (const s of rec.crop.seasonality) {
        if (seasonalRecommendations[s]) seasonalRecommendations[s].push(rec);
      }
    }
    for (const s of Object.keys(seasonalRecommendations)) {
      seasonalRecommendations[s] = seasonalRecommendations[s]
        .sort(function(a, b) { return b.score - a.score; })
        .slice(0, 5);
    }

    if (!aiNarrative) {
      const best = recs[0] ? recs[0].crop.name : 'the top crop';
      const mo = new Date().getMonth() + 1;
      const sea = mo >= 6 && mo <= 10 ? 'Kharif' : mo >= 11 || mo <= 3 ? 'Rabi' : 'Zaid';
      aiNarrative =
        'Based on your ' + (soilData ? soilData.type + ' soil' : 'current soil') + ' and ' +
        (currentWeather ? currentWeather.temperature + 'C' : 'current') + ' weather, ' +
        best + ' is your best option this ' + sea + ' season.';
    }

    const result: RecommendationResult = {
      bestCrop:  recs[0] || null,
      topCrops:  recs.slice(0, 5),
      seasonalRecommendations,
      aiNarrative,
      chemicalInsights: chemicalInsights || undefined,
      dataQuality,
    };

    _cache = { result, cacheKey: key, fetchedAt: Date.now() };
    return result;
  }

  static clearCache(): void {
    _cache = null;
  }
}
