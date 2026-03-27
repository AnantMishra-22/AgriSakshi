// marketService.ts
// Replaces mock random prices with a Claude API-powered price approximation model.
// All other public API surfaces (MarketPrice, MarketTrend, etc.) are unchanged
// so the rest of the app compiles without modification.

export interface MarketPrice {
  cropId: string;
  cropName: string;
  currentPrice: number;    // Rs per quintal
  previousPrice: number;
  predictedPrice: number;  // for harvest time
  priceChange: number;     // percentage
  market: string;
  date: string;
  demandTrend: 'increasing' | 'decreasing' | 'stable';
  supplyStatus: 'low' | 'medium' | 'high';
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

// ─── MSP anchor prices (₹/quintal, Kharif 2024-25 declared rates) ─────────────
// Used as reliable floor anchors for the model so it doesn't hallucinate.
// Source: CACP / Ministry of Agriculture India press releases.
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

type PriceOverrides = Record<string, number>;
const LS_KEY = 'market_price_overrides_v1';

// ─── Claude API price model ───────────────────────────────────────────────────

interface ModelPriceResult {
  currentPrice: number;
  previousPrice: number;
  predictedPrice: number;
  demandTrend: 'increasing' | 'decreasing' | 'stable';
  supplyStatus: 'low' | 'medium' | 'high';
  seasonalPattern: string;
  peakSeason: string;
  lowSeason: string;
  monthlyPrices: { month: string; price: number }[];
  forecastPrices: { month: string; price: number; confidence: number }[];
}

interface ModelBatchResult {
  prices: Record<string, {
    currentPrice: number;
    previousPrice: number;
    predictedPrice: number;
    demandTrend: 'increasing' | 'decreasing' | 'stable';
    supplyStatus: 'low' | 'medium' | 'high';
  }>;
}

// In-memory model cache to avoid re-calling Claude on every refresh
let modelBatchCache: { data: ModelBatchResult; fetchedAt: number } | null = null;
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const MODEL_TREND_CACHE: Map<string, { data: ModelPriceResult; fetchedAt: number }> = new Map();
const TREND_CACHE_TTL_MS = 15 * 60 * 1000;

function buildSystemPrompt(): string {
  const now = new Date();
  const month = now.toLocaleString('en-IN', { month: 'long' });
  const year = now.getFullYear();
  return `You are AgriSakshi's commodity price intelligence engine for Indian agricultural markets.
Today is ${month} ${year}. You have deep knowledge of Indian mandi prices, MSP rates, seasonal crop cycles,
demand-supply dynamics, and recent market conditions for Indian agricultural commodities.
IMPORTANT: Always respond with ONLY valid JSON — no markdown, no explanation, no code fences.`;
}

async function callClaude(userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  // Strip any accidental code fences
  return text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
}

async function fetchBatchPrices(cropIds: string[]): Promise<ModelBatchResult> {
  const now = Date.now();
  if (modelBatchCache && now - modelBatchCache.fetchedAt < MODEL_CACHE_TTL_MS) {
    return modelBatchCache.data;
  }

  const anchors = cropIds.map(id => `${id}:${MSP_ANCHORS[id] ?? 2000}`).join(', ');
  const prompt = `Estimate current Indian mandi market prices for these agricultural commodities.
Use these MSP/floor anchors (₹/quintal) as reference: ${anchors}.
Current prices typically trade 5-25% above MSP depending on season and demand.

Return ONLY a JSON object in this exact shape:
{
  "prices": {
    "<cropId>": {
      "currentPrice": <number, ₹/quintal>,
      "previousPrice": <number, last month price>,
      "predictedPrice": <number, 3-month outlook>,
      "demandTrend": "increasing"|"decreasing"|"stable",
      "supplyStatus": "low"|"medium"|"high"
    }
  }
}

Crops: ${cropIds.join(', ')}
Use realistic Indian mandi prices as of ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}.`;

  const raw = await callClaude(prompt);
  const parsed: ModelBatchResult = JSON.parse(raw);

  // Validate & clamp: ensure prices never go below 80% of MSP
  for (const cropId of cropIds) {
    const entry = parsed.prices?.[cropId];
    if (!entry) continue;
    const floor = (MSP_ANCHORS[cropId] ?? 1000) * 0.8;
    entry.currentPrice  = Math.max(Math.round(entry.currentPrice ?? floor), floor);
    entry.previousPrice = Math.max(Math.round(entry.previousPrice ?? entry.currentPrice * 0.97), floor);
    entry.predictedPrice = Math.max(Math.round(entry.predictedPrice ?? entry.currentPrice * 1.03), floor);
    if (!['increasing','decreasing','stable'].includes(entry.demandTrend)) {
      entry.demandTrend = 'stable';
    }
    if (!['low','medium','high'].includes(entry.supplyStatus)) {
      entry.supplyStatus = 'medium';
    }
  }

  modelBatchCache = { data: parsed, fetchedAt: now };
  return parsed;
}

async function fetchCropTrendDetail(cropId: string, cropName: string): Promise<ModelPriceResult> {
  const cached = MODEL_TREND_CACHE.get(cropId);
  if (cached && Date.now() - cached.fetchedAt < TREND_CACHE_TTL_MS) {
    return cached.data;
  }

  const msp = MSP_ANCHORS[cropId] ?? 2000;
  const currentMonthIdx = new Date().getMonth(); // 0=Jan
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const nextMonths = Array.from({ length: 6 }, (_, i) => {
    const idx = (currentMonthIdx + 1 + i) % 12;
    const year = (currentMonthIdx + 1 + i) > 11 ? new Date().getFullYear() + 1 : new Date().getFullYear();
    return `${months[idx]} ${year}`;
  });

  const prompt = `Provide a detailed price analysis for ${cropName} (${cropId}) in Indian markets.
MSP/anchor price: ₹${msp}/quintal.

Return ONLY this JSON (no extra fields):
{
  "currentPrice": <₹/quintal>,
  "previousPrice": <last month>,
  "predictedPrice": <3-month prediction>,
  "demandTrend": "increasing"|"decreasing"|"stable",
  "supplyStatus": "low"|"medium"|"high",
  "seasonalPattern": "<1-2 sentence description of price seasonality>",
  "peakSeason": "<month range e.g. Oct-Dec>",
  "lowSeason": "<month range>",
  "monthlyPrices": [
    ${months.map(m => `{"month":"${m}","price":<₹>}`).join(', ')}
  ],
  "forecastPrices": [
    ${nextMonths.map(m => `{"month":"${m}","price":<₹>,"confidence":<50-90>}`).join(', ')}
  ]
}`;

  const raw = await callClaude(prompt);
  const parsed: ModelPriceResult = JSON.parse(raw);

  // Validate monthly prices
  if (!Array.isArray(parsed.monthlyPrices) || parsed.monthlyPrices.length !== 12) {
    parsed.monthlyPrices = months.map((month, i) => ({
      month,
      price: Math.round(msp * (0.9 + 0.3 * Math.sin((i + cropId.length) * 0.5))),
    }));
  }
  if (!Array.isArray(parsed.forecastPrices) || parsed.forecastPrices.length !== 6) {
    parsed.forecastPrices = nextMonths.map((month, i) => ({
      month,
      price: Math.round((parsed.currentPrice || msp) * (0.95 + i * 0.01)),
      confidence: Math.round(85 - i * 3),
    }));
  }

  const floor = msp * 0.8;
  parsed.currentPrice  = Math.max(Math.round(parsed.currentPrice  ?? msp), floor);
  parsed.previousPrice = Math.max(Math.round(parsed.previousPrice ?? parsed.currentPrice * 0.97), floor);
  parsed.predictedPrice = Math.max(Math.round(parsed.predictedPrice ?? parsed.currentPrice * 1.03), floor);
  parsed.monthlyPrices = parsed.monthlyPrices.map(mp => ({
    ...mp, price: Math.max(Math.round(mp.price), floor),
  }));
  parsed.forecastPrices = parsed.forecastPrices.map(fp => ({
    ...fp, price: Math.max(Math.round(fp.price), floor), confidence: Math.min(95, Math.max(40, fp.confidence)),
  }));

  MODEL_TREND_CACHE.set(cropId, { data: parsed, fetchedAt: Date.now() });
  return parsed;
}

// ─── Fallback: deterministic price from MSP (used when API fails) ─────────────

function deterministicPrice(cropId: string, salt = 0): number {
  const base = MSP_ANCHORS[cropId] ?? 2000;
  // +8% to +18% above MSP (stable, non-random)
  const factor = 1.08 + (((cropId.charCodeAt(0) + salt) % 10) / 100);
  return Math.round(base * factor);
}

// ─── MarketService class ───────────────────────────────────────────────────────

export class MarketService {
  private static readonly ALL_CROPS = Object.keys(MSP_ANCHORS);

  private static priceOverrides: PriceOverrides = MarketService.loadOverrides();

  private static get storage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch {}
    return null;
  }

  private static loadOverrides(): PriceOverrides {
    try {
      const raw = this.storage?.getItem(LS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const cleaned: PriceOverrides = {};
      for (const k of Object.keys(parsed)) {
        const v = Number(parsed[k]);
        if (Number.isFinite(v) && v > 0) cleaned[k] = Math.round(v);
      }
      return cleaned;
    } catch {
      return {};
    }
  }

  private static saveOverrides() {
    try {
      this.storage?.setItem(LS_KEY, JSON.stringify(this.priceOverrides));
    } catch {}
  }

  static setCurrentPrice(cropId: string, price: number) {
    if (!cropId) return;
    const n = Math.round(Number(price));
    if (!Number.isFinite(n) || n <= 0) return;
    this.priceOverrides[cropId] = n;
    this.saveOverrides();
  }

  static clearCurrentPrice(cropId: string) {
    if (!cropId) return;
    delete this.priceOverrides[cropId];
    this.saveOverrides();
  }

  static getCurrentPriceOverride(cropId: string): number | undefined {
    return this.priceOverrides[cropId];
  }

  static upsertCurrentPrices(overrides: Record<string, number>) {
    for (const [k, v] of Object.entries(overrides)) {
      const n = Math.round(Number(v));
      if (Number.isFinite(n) && n > 0) this.priceOverrides[k] = n;
    }
    this.saveOverrides();
  }

  static getBasePrice(cropId: string): number | undefined {
    return MSP_ANCHORS[cropId];
  }

  static setBasePrice(_cropId: string, _price: number) {
    // no-op — MSPs are constants; kept for API compat
  }

  // ── Main data fetch ──────────────────────────────────────────────────────────

  static async getCurrentPrices(): Promise<MarketPrice[]> {
    let modelData: ModelBatchResult | null = null;

    try {
      modelData = await fetchBatchPrices(this.ALL_CROPS);
    } catch (err) {
      console.warn('[MarketService] Claude API unavailable, using deterministic fallback:', err);
    }

    const today = new Date().toISOString().split('T')[0];

    return this.ALL_CROPS.map(cropId => {
      const override = this.priceOverrides[cropId];
      const model = modelData?.prices?.[cropId];

      const currentPrice: number = override ?? model?.currentPrice ?? deterministicPrice(cropId, 1);
      const previousPrice: number = model?.previousPrice ?? Math.round(currentPrice * 0.97);
      const predictedPrice: number = model?.predictedPrice ?? Math.round(currentPrice * 1.04);
      const priceChange = Math.round(((currentPrice - previousPrice) / previousPrice) * 1000) / 10;

      return {
        cropId,
        cropName: this.getCropDisplayName(cropId),
        currentPrice,
        previousPrice,
        predictedPrice,
        priceChange,
        market: this.getDefaultMarket(),
        date: today,
        demandTrend: model?.demandTrend ?? 'stable',
        supplyStatus: model?.supplyStatus ?? 'medium',
      };
    });
  }

  static async getMarketTrends(cropId: string): Promise<MarketTrend> {
    let detail: ModelPriceResult | null = null;

    try {
      detail = await fetchCropTrendDetail(cropId, this.getCropDisplayName(cropId));
    } catch (err) {
      console.warn('[MarketService] Trend fetch failed, using deterministic fallback:', err);
    }

    const base = MSP_ANCHORS[cropId] ?? 2000;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentMonthIdx = new Date().getMonth();
    const nextYear = new Date().getFullYear() + (currentMonthIdx >= 6 ? 1 : 0);

    const monthlyPrices = detail?.monthlyPrices ?? months.map((month, i) => ({
      month,
      price: Math.round(base * (0.85 + 0.3 * Math.sin((i + cropId.length) * 0.5))),
    }));

    const forecastPrices = detail?.forecastPrices ?? Array.from({ length: 6 }, (_, i) => {
      const idx = (currentMonthIdx + 1 + i) % 12;
      return {
        month: `${months[idx]} ${nextYear}`,
        price: Math.round((detail?.currentPrice ?? base) * (0.95 + i * 0.01)),
        confidence: Math.round(85 - i * 3),
      };
    });

    const avgPrice = Math.round(monthlyPrices.reduce((s, m) => s + m.price, 0) / monthlyPrices.length);

    return {
      cropId,
      cropName: this.getCropDisplayName(cropId),
      monthlyPrices,
      forecastPrices,
      seasonalPattern: detail?.seasonalPattern ?? this.getSeasonalPattern(cropId),
      averagePrice: avgPrice,
      peakSeason: detail?.peakSeason ?? this.getPeakSeason(cropId),
      lowSeason: detail?.lowSeason ?? this.getLowSeason(cropId),
    };
  }

  static async getPricesByLocation(latitude: number, longitude: number): Promise<MarketPrice[]> {
    const allPrices = await this.getCurrentPrices();
    const nearestMarket = this.getNearestMarket(latitude, longitude);
    // Apply a tiny ±3% location premium (deterministic per market, not random)
    const marketSeed = nearestMarket.charCodeAt(0);
    const factor = 1 + ((marketSeed % 7) - 3) / 100;

    return allPrices.map(price => ({
      ...price,
      currentPrice: this.priceOverrides[price.cropId]
        ? price.currentPrice   // don't shift user-set overrides
        : Math.round(price.currentPrice * factor),
      market: nearestMarket,
    }));
  }

  static getMarketInsights(cropId: string, currentWeather: any): string[] {
    const insights: string[] = [];
    if (currentWeather?.temperature > 35) {
      insights.push('High temperatures may affect supply, potentially driving prices up');
    }
    if (currentWeather?.rainfall > 5) {
      insights.push('Good rainfall may boost production, potentially stabilizing prices');
    }
    const cropInsights: Record<string, string[]> = {
      rice:     ['Monsoon performance directly impacts rice prices', 'Export policies affect domestic pricing'],
      wheat:    ['Government procurement affects market rates', 'International wheat prices influence domestic market'],
      cotton:   ['Textile industry demand drives pricing', 'Global cotton futures affect local rates'],
      sugarcane:['Sugar mill operations influence cane prices', 'Ethanol blending policies impact pricing'],
    };
    if (cropInsights[cropId]) insights.push(...cropInsights[cropId]);
    return insights;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private static getCropDisplayName(cropId: string): string {
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

  private static getDefaultMarket(): string {
    // Rotates across major markets without being random (deterministic on date)
    const markets = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad'];
    return markets[new Date().getDate() % markets.length];
  }

  private static getSeasonalPattern(cropId: string): string {
    const patterns: Record<string, string> = {
      rice:      'Prices peak during festival seasons (Oct-Nov)',
      wheat:     'Highest in summer months before harvest',
      maize:     'Steady demand, peaks in winter',
      cotton:    'Peak demand during textile season',
      sugarcane: 'Prices rise during crushing season',
      tea:       'Higher during winter months',
      coffee:    'Export-driven, varies with global demand',
    };
    return patterns[cropId] ?? 'Seasonal variations based on harvest cycles';
  }

  private static getPeakSeason(cropId: string): string {
    const seasons: Record<string, string> = {
      rice: 'Oct-Dec', wheat: 'Mar-May', maize: 'Dec-Feb',
      cotton: 'Nov-Jan', sugarcane: 'Nov-Apr', tea: 'Nov-Feb', coffee: 'Jan-Mar',
    };
    return seasons[cropId] ?? 'Varies by region';
  }

  private static getLowSeason(cropId: string): string {
    const seasons: Record<string, string> = {
      rice: 'Apr-Jun', wheat: 'Jul-Sep', maize: 'Jun-Aug',
      cotton: 'May-Jul', sugarcane: 'Jun-Sep', tea: 'May-Aug', coffee: 'Aug-Oct',
    };
    return seasons[cropId] ?? 'Post-harvest period';
  }

  private static getNearestMarket(lat: number, lon: number): string {
    if (lat > 28) return 'Delhi';
    if (lat > 25 && lon > 77) return 'Kanpur';
    if (lat > 19 && lon < 75) return 'Mumbai';
    if (lat > 15 && lon > 78) return 'Hyderabad';
    if (lat < 15 && lon > 76) return 'Bangalore';
    if (lat < 15 && lon < 76) return 'Chennai';
    return 'Regional Market';
  }
}
      const currentPrice = override ?? Math.round(basePrice * (1 + variation));

      // keep previousPrice near current to avoid weird swings when overridden
      const previousPrice = Math.round(currentPrice * (0.95 + Math.random() * 0.1));

      const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

      return {
        cropId,
        cropName: this.getCropDisplayName(cropId),
        currentPrice,
        previousPrice,
        predictedPrice: Math.round(currentPrice * (1 + (Math.random() - 0.5) * 0.25)),
        priceChange: Math.round(priceChange * 10) / 10,
        market: markets[Math.floor(Math.random() * markets.length)],
        date: new Date().toISOString().split('T')[0],
        demandTrend: (['increasing', 'decreasing', 'stable'] as const)[Math.floor(Math.random() * 3)],
        supplyStatus: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)]
      };
    });
  }

  static async getMarketTrends(cropId: string): Promise<MarketTrend> {
    const basePrice = this.baseprices[cropId] || 2000;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyPrices = months.map((month, index) => ({
      month,
      price: Math.round(basePrice * (0.8 + 0.4 * Math.sin((index + cropId.length) * 0.5)))
    }));

    const forecastPrices = months.slice(0, 6).map((month, index) => ({
      month: `${month} 2025`,
      price: Math.round(basePrice * (0.85 + 0.3 * Math.sin((index + cropId.length) * 0.6))),
      confidence: Math.round(85 - index * 3)
    }));

    return {
      cropId,
      cropName: this.getCropDisplayName(cropId),
      monthlyPrices,
      forecastPrices,
      seasonalPattern: this.getSeasonalPattern(cropId),
      averagePrice: Math.round(monthlyPrices.reduce((sum, p) => sum + p.price, 0) / 12),
      peakSeason: this.getPeakSeason(cropId),
      lowSeason: this.getLowSeason(cropId)
    };
  }

  static async getPricesByLocation(latitude: number, longitude: number): Promise<MarketPrice[]> {
    // In real implementation, this would fetch location-specific market data
    const allPrices = await this.getCurrentPrices();

    // Simulate location-based price variations (applied on top of override/current)
    return allPrices.map((price) => ({
      ...price,
      currentPrice: Math.round(price.currentPrice * (0.95 + Math.random() * 0.1)),
      market: this.getNearestMarket(latitude, longitude)
    }));
  }

  private static getCropDisplayName(cropId: string): string {
    const nameMap: { [key: string]: string } = {
      rice: 'Rice',
      wheat: 'Wheat',
      maize: 'Maize',
      barley: 'Barley',
      jowar: 'Jowar (Sorghum)',
      bajra: 'Bajra (Pearl Millet)',
      ragi: 'Ragi (Finger Millet)',
      moong: 'Green Gram (Moong)',
      urad: 'Black Gram (Urad)',
      masoor: 'Lentil (Masoor)',
      chana: 'Chickpea (Chana)',
      groundnut: 'Groundnut',
      mustard: 'Mustard',
      soybean: 'Soybean',
      sunflower: 'Sunflower',
      sesame: 'Sesame (Til)',
      sugarcane: 'Sugarcane',
      tea: 'Tea',
      coffee: 'Coffee',
      coconut: 'Coconut',
      banana: 'Banana',
      cotton: 'Cotton',
      onion: 'Onion',
      potato: 'Potato',
      tomato: 'Tomato'
    };
    return nameMap[cropId] || cropId.charAt(0).toUpperCase() + cropId.slice(1);
  }

  private static getSeasonalPattern(cropId: string): string {
    const patterns: { [key: string]: string } = {
      rice: 'Prices peak during festival seasons (Oct-Nov)',
      wheat: 'Highest in summer months before harvest',
      maize: 'Steady demand, peaks in winter',
      cotton: 'Peak demand during textile season',
      sugarcane: 'Prices rise during crushing season',
      tea: 'Higher during winter months',
      coffee: 'Export-driven, varies with global demand'
    };
    return patterns[cropId] || 'Seasonal variations based on harvest cycles';
  }

  private static getPeakSeason(cropId: string): string {
    const peakSeasons: { [key: string]: string } = {
      rice: 'Oct-Dec',
      wheat: 'Mar-May',
      maize: 'Dec-Feb',
      cotton: 'Nov-Jan',
      sugarcane: 'Nov-Apr',
      tea: 'Nov-Feb',
      coffee: 'Jan-Mar'
    };
    return peakSeasons[cropId] || 'Varies by region';
  }

  private static getLowSeason(cropId: string): string {
    const lowSeasons: { [key: string]: string } = {
      rice: 'Apr-Jun',
      wheat: 'Jul-Sep',
      maize: 'Jun-Aug',
      cotton: 'May-Jul',
      sugarcane: 'Jun-Sep',
      tea: 'May-Aug',
      coffee: 'Aug-Oct'
    };
    return lowSeasons[cropId] || 'Post-harvest period';
  }

  private static getNearestMarket(latitude: number, longitude: number): string {
    // Simplified location-based market assignment
    if (latitude > 28) return 'Delhi';
    if (latitude > 25 && longitude > 77) return 'Kanpur';
    if (latitude > 19 && longitude < 75) return 'Mumbai';
    if (latitude > 15 && longitude > 78) return 'Hyderabad';
    if (latitude < 15 && longitude > 76) return 'Bangalore';
    if (latitude < 15 && longitude < 76) return 'Chennai';
    return 'Regional Market';
  }

  static getMarketInsights(cropId: string, currentWeather: any): string[] {
    const insights: string[] = [];
    // Weather-based insights
    if (currentWeather?.temperature > 35) {
      insights.push('High temperatures may affect supply, potentially driving prices up');
    }
    if (currentWeather?.rainfall > 5) {
      insights.push('Good rainfall may boost production, potentially stabilizing prices');
    }
    // Crop-specific insights
    const cropInsights: { [key: string]: string[] } = {
      rice: ['Monsoon performance directly impacts rice prices', 'Export policies affect domestic pricing'],
      wheat: ['Government procurement affects market rates', 'International wheat prices influence domestic market'],
      cotton: ['Textile industry demand drives pricing', 'Global cotton futures affect local rates'],
      sugarcane: ['Sugar mill operations influence cane prices', 'Ethanol blending policies impact pricing']
    };
    if (cropInsights[cropId]) insights.push(...cropInsights[cropId]);
    return insights;
  }
}
