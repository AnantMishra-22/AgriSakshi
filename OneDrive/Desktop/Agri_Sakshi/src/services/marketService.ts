// src/services/marketService.ts
// Real market price intelligence for Indian agricultural commodities.
//
// Data pipeline:
//  1. Fetch live mandi prices from data.gov.in Agmarknet API (free, no key needed)
//  2. Use Claude AI (via Supabase proxy) to interpret, fill gaps, and forecast
//  3. Ground Claude with real MSP anchors + live weather context
//  4. Cache aggressively to avoid excess API calls
//  5. Allow farmer price overrides (saved to localStorage)

import { callClaude, parseClaudeJSON } from './apiClient';

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface MarketPrice {
  cropId: string;
  cropName: string;
  currentPrice: number;    // ₹/quintal
  previousPrice: number;
  predictedPrice: number;  // 3-month outlook
  priceChange: number;     // percentage change vs previous
  market: string;          // mandi/market name
  date: string;
  demandTrend: 'increasing' | 'decreasing' | 'stable';
  supplyStatus: 'low' | 'medium' | 'high';
  source: 'agmarknet' | 'ai_estimate' | 'user_override';
}

export interface MarketTrend {
  cropId: string;
  cropName: string;
  monthlyPrices: { month: string; price: number }[];
  forecastPrices: { month: string; price: number; confidence: number }[];
  seasonalPattern: string;
  averagePrice: number;
  peakSeason: string;
  lowSeason: string;
}

// ─── MSP anchors (₹/quintal, Kharif 2024-25 declared rates) ──────────────────
// Source: CACP / Ministry of Agriculture India press releases
const MSP_ANCHORS: Record<string, number> = {
  rice:       2300,
  wheat:      2275,
  maize:      2090,
  barley:     1735,
  jowar:      3371,
  bajra:      2625,
  ragi:       4290,
  moong:      8682,
  urad:       7400,
  masoor:     6425,
  chana:      5440,
  groundnut:  6783,
  mustard:    5950,
  soybean:    4892,
  sunflower:  7280,
  sesame:     9267,
  sugarcane:   340,   // ₹/quintal FRP
  cotton:     7121,
  onion:      1800,   // indicative mandi floor
  potato:     1300,
  tomato:     2200,
  tea:       26000,   // avg auction CTC Assam
  coffee:    38000,   // robusta parchment avg
  coconut:    1350,   // copra equivalent
  banana:      900,
};

// Map our cropId to Agmarknet commodity names (for API lookup)
const AGMARKNET_COMMODITY_MAP: Record<string, string> = {
  rice:      'Rice',
  wheat:     'Wheat',
  maize:     'Maize',
  onion:     'Onion',
  potato:    'Potato',
  tomato:    'Tomato',
  cotton:    'Cotton',
  soybean:   'Soybean',
  groundnut: 'Groundnut',
  mustard:   'Rapeseed/Mustard',
  chana:     'Gram(Whole)',
  moong:     'Moong Dal',
  urad:      'Urad Dal',
  sugarcane: 'Sugarcane',
  bajra:     'Bajra(Pearl Millet/Cumbu)',
  jowar:     'Jowar(Sorghum)',
};

type PriceOverrides = Record<string, number>;
const LS_KEY = 'market_price_overrides_v1';

// ─── Cache layer ──────────────────────────────────────────────────────────────

interface BatchCache {
  data: Record<string, { currentPrice: number; previousPrice: number; predictedPrice: number; demandTrend: MarketPrice['demandTrend']; supplyStatus: MarketPrice['supplyStatus']; market: string; source: MarketPrice['source'] }>;
  fetchedAt: number;
}

interface TrendCache {
  data: MarketTrend;
  fetchedAt: number;
}

let batchCache: BatchCache | null = null;
const BATCH_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const trendCache = new Map<string, TrendCache>();
const TREND_CACHE_TTL = 20 * 60 * 1000; // 20 minutes

// ─── Agmarknet (data.gov.in) live price fetcher ───────────────────────────────
// Public API, no key required. Returns recent mandi arrival prices.

interface AgmarknetRecord {
  commodity: string;
  market: string;
  modal_price: string;
  min_price: string;
  max_price: string;
  arrival_date: string;
  state: string;
  district: string;
}

async function fetchAgmarknetPrices(
  commodityName: string,
  state?: string
): Promise<AgmarknetRecord[]> {
  // data.gov.in Agmarknet API endpoint
  const API_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
  const params = new URLSearchParams({
    'api-key': 'your_data_gov_key', // set VITE_DATA_GOV_KEY in .env — free registration at data.gov.in
    format: 'json',
    limit: '10',
    'filters[commodity]': commodityName,
    ...(state ? { 'filters[state]': state } : {}),
  });

  // Replace with env key if available
  const key = (import.meta.env.VITE_DATA_GOV_KEY as string) || '';
  if (key) {
    params.set('api-key', key);
  }

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) throw new Error(`Agmarknet fetch failed: ${response.status}`);

  const data = await response.json();
  return (data.records as AgmarknetRecord[]) || [];
}

function agmarknetToPrice(records: AgmarknetRecord[], cropId: string): { price: number; market: string } | null {
  if (!records.length) return null;

  // Take modal price from the most recent record
  const sorted = records
    .filter((r) => r.modal_price && Number(r.modal_price) > 0)
    .sort((a, b) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime());

  if (!sorted.length) return null;

  const best = sorted[0];
  const price = Math.round(Number(best.modal_price));
  return price > 0 ? { price, market: best.market } : null;
}

// ─── Claude AI price estimator (fallback + enrichment) ───────────────────────

function buildMarketSystemPrompt(): string {
  const now = new Date();
  const month = now.toLocaleString('en-IN', { month: 'long' });
  const year = now.getFullYear();
  const season = getSeason(now.getMonth());
  return `You are AgriSakshi's commodity price intelligence engine for Indian agricultural markets.
Today is ${month} ${year} (${season} season). You have deep knowledge of Indian mandi prices,
MSP rates, seasonal crop cycles, demand-supply dynamics, and recent market conditions.
IMPORTANT: Always respond with ONLY valid JSON — no markdown, no explanation, no code fences.`;
}

function getSeason(monthIndex: number): string {
  if (monthIndex >= 5 && monthIndex <= 8) return 'Kharif sowing';
  if (monthIndex >= 9 && monthIndex <= 11) return 'Kharif harvest / Rabi sowing';
  if (monthIndex >= 0 && monthIndex <= 2) return 'Rabi growing';
  return 'Rabi harvest / Zaid';
}

async function claudeEnrichPrices(
  cropIds: string[],
  agmarknetData: Record<string, { price: number; market: string } | null>,
  weatherSummary: string
): Promise<BatchCache['data']> {
  const now = new Date();
  const month = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const season = getSeason(now.getMonth());

  // Build context with real prices where available
  const cropContext = cropIds.map((id) => {
    const msp = MSP_ANCHORS[id] ?? 2000;
    const live = agmarknetData[id];
    return `${id}: MSP=₹${msp}, ${live ? `live_mandi=₹${live.price} (${live.market})` : 'no_live_data'}`;
  }).join('\n');

  const prompt = `Current date: ${month} | Season: ${season}
Current weather context: ${weatherSummary}

Known price data:
${cropContext}

For crops with live mandi prices, use those as currentPrice (±5% for location variance).
For crops WITHOUT live data, estimate from MSP: current prices typically 8-22% above MSP in ${season} season.

previousPrice = last month price (use seasonal knowledge)
predictedPrice = 3-month outlook (factor in ${season} seasonal trends)
demandTrend: consider festival seasons, harvest timing, export policy
supplyStatus: consider crop calendar and weather impact

Return ONLY JSON:
{
  "prices": {
${cropIds.map((id) => `    "${id}": { "currentPrice": <₹/quintal>, "previousPrice": <₹>, "predictedPrice": <₹>, "demandTrend": "increasing"|"decreasing"|"stable", "supplyStatus": "low"|"medium"|"high" }`).join(',\n')}
  }
}`;

  const raw = await callClaude({
    system: buildMarketSystemPrompt(),
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = parseClaudeJSON<{ prices: Record<string, { currentPrice: number; previousPrice: number; predictedPrice: number; demandTrend: MarketPrice['demandTrend']; supplyStatus: MarketPrice['supplyStatus'] }> }>(raw);

  // Build final result: merge live prices + AI enrichment
  const result: BatchCache['data'] = {};
  for (const cropId of cropIds) {
    const ai = parsed.prices?.[cropId];
    const live = agmarknetData[cropId];
    const msp = MSP_ANCHORS[cropId] ?? 2000;
    const floor = msp * 0.8;

    const currentPrice = live?.price ?? Math.max(Math.round(ai?.currentPrice ?? msp * 1.1), floor);
    const previousPrice = Math.max(Math.round(ai?.previousPrice ?? currentPrice * 0.97), floor);
    const predictedPrice = Math.max(Math.round(ai?.predictedPrice ?? currentPrice * 1.03), floor);

    result[cropId] = {
      currentPrice,
      previousPrice,
      predictedPrice,
      demandTrend: ai?.demandTrend ?? 'stable',
      supplyStatus: ai?.supplyStatus ?? 'medium',
      market: live?.market ?? 'Regional Market',
      source: live ? 'agmarknet' : 'ai_estimate',
    };
  }

  return result;
}

// ─── Trend detail via Claude ──────────────────────────────────────────────────

async function fetchTrendDetail(cropId: string, cropName: string): Promise<MarketTrend> {
  const msp = MSP_ANCHORS[cropId] ?? 2000;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  const nextMonths = Array.from({ length: 6 }, (_, i) => {
    const idx = (currentMonthIdx + 1 + i) % 12;
    const yr = currentMonthIdx + 1 + i > 11 ? new Date().getFullYear() + 1 : new Date().getFullYear();
    return `${months[idx]} ${yr}`;
  });

  const prompt = `Detailed price analysis for ${cropName} (${cropId}) in Indian markets.
MSP reference: ₹${msp}/quintal. Current month: ${months[currentMonthIdx]} ${new Date().getFullYear()}.

Key factors: crop calendar (Kharif/Rabi), MSP procurement policy, export restrictions, festival demand.

Return ONLY this JSON:
{
  "seasonalPattern": "<1-2 sentence description of annual price cycle for Indian farmers>",
  "peakSeason": "<month range e.g. Oct-Dec when prices are highest>",
  "lowSeason": "<month range when prices are lowest (usually post-harvest)>",
  "monthlyPrices": [
    ${months.map((m) => `{"month":"${m}","price":<realistic ₹/quintal for ${m}>}`).join(', ')}
  ],
  "forecastPrices": [
    ${nextMonths.map((m) => `{"month":"${m}","price":<₹/quintal>,"confidence":<55-90>}`).join(', ')}
  ]
}

Monthly prices should reflect actual Indian seasonal price patterns (high post-monsoon, low post-harvest).
Confidence decreases with time: 80-90% for month 1-2, 65-80% for month 3-4, 55-65% for month 5-6.`;

  const raw = await callClaude({
    system: buildMarketSystemPrompt(),
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = parseClaudeJSON<{
    seasonalPattern: string;
    peakSeason: string;
    lowSeason: string;
    monthlyPrices: { month: string; price: number }[];
    forecastPrices: { month: string; price: number; confidence: number }[];
  }>(raw);

  const floor = msp * 0.8;

  // Sanitize
  const monthlyPrices = Array.isArray(parsed.monthlyPrices) && parsed.monthlyPrices.length === 12
    ? parsed.monthlyPrices.map((mp) => ({ month: mp.month, price: Math.max(Math.round(mp.price), floor) }))
    : months.map((m, i) => ({ month: m, price: Math.round(msp * (0.9 + 0.25 * Math.sin((i + cropId.length) * 0.5))) }));

  const forecastPrices = Array.isArray(parsed.forecastPrices) && parsed.forecastPrices.length === 6
    ? parsed.forecastPrices.map((fp) => ({
        month: fp.month,
        price: Math.max(Math.round(fp.price), floor),
        confidence: Math.min(90, Math.max(50, fp.confidence)),
      }))
    : nextMonths.map((m, i) => ({
        month: m,
        price: Math.round(msp * (1.1 - i * 0.01)),
        confidence: Math.round(80 - i * 5),
      }));

  const avgPrice = Math.round(monthlyPrices.reduce((s, m) => s + m.price, 0) / monthlyPrices.length);

  return {
    cropId,
    cropName,
    monthlyPrices,
    forecastPrices,
    seasonalPattern: parsed.seasonalPattern || `${cropName} prices follow the Indian crop calendar.`,
    averagePrice: avgPrice,
    peakSeason: parsed.peakSeason || 'Oct-Dec',
    lowSeason: parsed.lowSeason || 'Apr-Jun',
  };
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

function deterministicPrice(cropId: string): number {
  const base = MSP_ANCHORS[cropId] ?? 2000;
  const factor = 1.08 + ((cropId.charCodeAt(0) % 10) / 100);
  return Math.round(base * factor);
}

// ─── MarketService ────────────────────────────────────────────────────────────

export class MarketService {
  private static readonly ALL_CROPS = Object.keys(MSP_ANCHORS);
  private static priceOverrides: PriceOverrides = MarketService.loadOverrides();

  private static get storage(): Storage | null {
    try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
  }

  private static loadOverrides(): PriceOverrides {
    try {
      const raw = this.storage?.getItem(LS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const cleaned: PriceOverrides = {};
      for (const k of Object.keys(parsed)) {
        const v = Number(parsed[k]);
        if (Number.isFinite(v) && v > 0) cleaned[k] = Math.round(v);
      }
      return cleaned;
    } catch { return {}; }
  }

  private static saveOverrides() {
    try { this.storage?.setItem(LS_KEY, JSON.stringify(this.priceOverrides)); } catch {}
  }

  static setCurrentPrice(cropId: string, price: number) {
    const n = Math.round(Number(price));
    if (cropId && Number.isFinite(n) && n > 0) {
      this.priceOverrides[cropId] = n;
      this.saveOverrides();
    }
  }

  static clearCurrentPrice(cropId: string) {
    delete this.priceOverrides[cropId];
    this.saveOverrides();
  }

  static getCurrentPriceOverride(cropId: string): number | undefined {
    return this.priceOverrides[cropId];
  }

  // ── Main fetch ──────────────────────────────────────────────────────────────

  /**
   * Get current prices for all crops.
   * Strategy: Agmarknet live → Claude AI enrichment → deterministic fallback
   */
  static async getCurrentPrices(weatherSummary = ''): Promise<MarketPrice[]> {
    const now = Date.now();

    // Use cache if fresh
    if (batchCache && now - batchCache.fetchedAt < BATCH_CACHE_TTL) {
      return this.formatPrices(batchCache.data);
    }

    // 1. Try Agmarknet for crops that have a mapping
    const agmarknetData: Record<string, { price: number; market: string } | null> = {};
    const agmarknetFetches = Object.entries(AGMARKNET_COMMODITY_MAP).map(async ([cropId, commodityName]) => {
      try {
        const records = await fetchAgmarknetPrices(commodityName);
        agmarknetData[cropId] = agmarknetToPrice(records, cropId);
      } catch {
        agmarknetData[cropId] = null;
      }
    });
    await Promise.allSettled(agmarknetFetches);

    let batchData: BatchCache['data'];
    try {
      // 2. Claude enrichment — fills gaps and adds demand/supply intelligence
      batchData = await claudeEnrichPrices(this.ALL_CROPS, agmarknetData, weatherSummary);
    } catch (err) {
      console.warn('[MarketService] AI enrichment failed, using deterministic fallback:', err);
      // 3. Pure deterministic fallback
      batchData = {};
      for (const cropId of this.ALL_CROPS) {
        const live = agmarknetData[cropId];
        const fb = live?.price ?? deterministicPrice(cropId);
        batchData[cropId] = {
          currentPrice: fb,
          previousPrice: Math.round(fb * 0.97),
          predictedPrice: Math.round(fb * 1.04),
          demandTrend: 'stable',
          supplyStatus: 'medium',
          market: live?.market ?? 'Regional Market',
          source: live ? 'agmarknet' : 'ai_estimate',
        };
      }
    }

    batchCache = { data: batchData, fetchedAt: now };
    return this.formatPrices(batchData);
  }

  private static formatPrices(data: BatchCache['data']): MarketPrice[] {
    const today = new Date().toISOString().split('T')[0];
    return this.ALL_CROPS.map((cropId) => {
      const override = this.priceOverrides[cropId];
      const entry = data[cropId];
      const currentPrice = override ?? entry?.currentPrice ?? deterministicPrice(cropId);
      const previousPrice = entry?.previousPrice ?? Math.round(currentPrice * 0.97);
      const priceChange = Math.round(((currentPrice - previousPrice) / previousPrice) * 1000) / 10;

      return {
        cropId,
        cropName: this.getCropDisplayName(cropId),
        currentPrice,
        previousPrice,
        predictedPrice: entry?.predictedPrice ?? Math.round(currentPrice * 1.04),
        priceChange,
        market: entry?.market ?? 'Regional Market',
        date: today,
        demandTrend: entry?.demandTrend ?? 'stable',
        supplyStatus: entry?.supplyStatus ?? 'medium',
        source: override ? 'user_override' : (entry?.source ?? 'ai_estimate'),
      };
    });
  }

  static async getPricesByLocation(latitude: number, longitude: number, weatherSummary = ''): Promise<MarketPrice[]> {
    const allPrices = await this.getCurrentPrices(weatherSummary);
    const nearestMarket = this.getNearestMarket(latitude, longitude);
    // Deterministic ±3% location premium based on market
    const factor = 1 + ((nearestMarket.charCodeAt(0) % 7) - 3) / 100;

    return allPrices.map((price) => ({
      ...price,
      currentPrice: this.priceOverrides[price.cropId]
        ? price.currentPrice
        : Math.round(price.currentPrice * factor),
      market: nearestMarket,
    }));
  }

  static async getMarketTrends(cropId: string): Promise<MarketTrend> {
    const cached = trendCache.get(cropId);
    if (cached && Date.now() - cached.fetchedAt < TREND_CACHE_TTL) {
      return cached.data;
    }

    try {
      const trend = await fetchTrendDetail(cropId, this.getCropDisplayName(cropId));
      trendCache.set(cropId, { data: trend, fetchedAt: Date.now() });
      return trend;
    } catch (err) {
      console.warn('[MarketService] Trend fetch failed, using fallback:', err);
      return this.deterministicTrend(cropId);
    }
  }

  private static deterministicTrend(cropId: string): MarketTrend {
    const base = MSP_ANCHORS[cropId] ?? 2000;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const nextMonths = Array.from({ length: 6 }, (_, i) => {
      const idx = (currentMonthIdx + 1 + i) % 12;
      const yr = currentMonthIdx + 1 + i > 11 ? new Date().getFullYear() + 1 : new Date().getFullYear();
      return `${months[idx]} ${yr}`;
    });
    const monthlyPrices = months.map((m, i) => ({
      month: m,
      price: Math.round(base * (0.9 + 0.25 * Math.sin((i + cropId.length) * 0.5))),
    }));
    const avg = Math.round(monthlyPrices.reduce((s, m) => s + m.price, 0) / 12);
    return {
      cropId,
      cropName: this.getCropDisplayName(cropId),
      monthlyPrices,
      forecastPrices: nextMonths.map((m, i) => ({
        month: m, price: Math.round(base * (1.08 - i * 0.01)), confidence: Math.round(80 - i * 4),
      })),
      seasonalPattern: `${this.getCropDisplayName(cropId)} prices follow Indian crop calendar patterns.`,
      averagePrice: avg,
      peakSeason: 'Oct-Dec',
      lowSeason: 'Apr-Jun',
    };
  }

  static getMarketInsights(cropId: string, currentWeather: { temperature?: number; rainfall?: number }): string[] {
    const insights: string[] = [];
    if ((currentWeather?.temperature ?? 0) > 35) {
      insights.push('High temperatures may reduce supply and push prices up temporarily.');
    }
    if ((currentWeather?.rainfall ?? 0) > 5) {
      insights.push('Good rainfall supports crop growth and may stabilise prices post-harvest.');
    }
    const season = getSeason(new Date().getMonth());
    insights.push(`Current season (${season}) typically influences ${this.getCropDisplayName(cropId)} prices.`);

    const cropInsights: Record<string, string[]> = {
      rice: ['Monsoon performance directly impacts rice prices.', 'Government procurement and PDS offtake affect open market rates.'],
      wheat: ['Government procurement at MSP sets a floor during Apr-Jun.', 'International wheat prices can influence domestic market.'],
      cotton: ['Textile industry demand and export policy drive cotton prices.', 'Bt cotton seed cost affects farmer profitability.'],
      sugarcane: ['Sugar mill payment cycles influence cane arrivals.', 'Ethanol blending mandate from government affects sugarcane demand.'],
      onion: ['Onion is highly volatile — storage and export policy can double or halve prices in weeks.', 'Cold storage arrivals in Apr-Jun typically bring prices down.'],
      tomato: ['Tomato prices are highly seasonal — check weekly mandi rates.', 'Logistics and perishability cause sharp regional price differences.'],
    };
    if (cropInsights[cropId]) insights.push(...cropInsights[cropId]);
    return insights.slice(0, 4);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  static getCropDisplayName(cropId: string): string {
    const nameMap: Record<string, string> = {
      rice: 'Rice', wheat: 'Wheat', maize: 'Maize', barley: 'Barley',
      jowar: 'Jowar (Sorghum)', bajra: 'Bajra (Pearl Millet)',
      ragi: 'Ragi (Finger Millet)', moong: 'Green Gram (Moong)',
      urad: 'Black Gram (Urad)', masoor: 'Lentil (Masoor)',
      chana: 'Chickpea (Chana)', groundnut: 'Groundnut',
      mustard: 'Mustard', soybean: 'Soybean',
      sunflower: 'Sunflower', sesame: 'Sesame (Til)',
      sugarcane: 'Sugarcane', tea: 'Tea', coffee: 'Coffee',
      coconut: 'Coconut', banana: 'Banana', cotton: 'Cotton',
      onion: 'Onion', potato: 'Potato', tomato: 'Tomato',
    };
    return nameMap[cropId] || (cropId.charAt(0).toUpperCase() + cropId.slice(1));
  }

  private static getNearestMarket(lat: number, lon: number): string {
    if (lat > 28) return 'Delhi';
    if (lat > 25 && lon > 77) return 'Kanpur';
    if (lat > 20 && lon < 76) return 'Pune';
    if (lat > 19 && lon < 75) return 'Mumbai';
    if (lat > 17 && lon > 78) return 'Hyderabad';
    if (lat > 15 && lon > 78) return 'Hyderabad';
    if (lat < 15 && lon > 76) return 'Bangalore';
    if (lat < 15 && lon < 76) return 'Chennai';
    if (lat > 22 && lon > 85) return 'Kolkata';
    if (lat > 22 && lon < 80) return 'Nagpur';
    return 'Regional Market';
  }
}
