export interface MarketPrice {
  cropId: string;
  cropName: string;
  currentPrice: number; // Rs per quintal
  previousPrice: number;
  predictedPrice: number; // for harvest time
  priceChange: number; // percentage
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

type PriceOverrides = Record<string, number>;
const LS_KEY = 'market_price_overrides_v1';

export class MarketService {
  // Mock market data - in production, connect to real market APIs
  private static baseprices: { [key: string]: number } = {
    rice: 1850,
    wheat: 2000,
    maize: 1650,
    barley: 1400,
    jowar: 2800,
    bajra: 2200,
    ragi: 3200,
    moong: 6500,
    urad: 5800,
    masoor: 4500,
    chana: 4800,
    groundnut: 5500,
    mustard: 4200,
    soybean: 4000,
    sunflower: 6200,
    sesame: 8500,
    sugarcane: 320,
    tea: 25000,
    coffee: 35000,
    coconut: 1200,
    banana: 800,
    cotton: 5800,
    onion: 1500,
    potato: 1200,
    tomato: 2500
  };

  /* ---------------- NEW: user-settable current price overrides ---------------- */

  // in-memory cache of overrides (loaded once)
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
    } catch {
      // ignore storage errors (private mode / SSR)
    }
  }

  /** Set/override CURRENT price (per crop). Persists in localStorage. */
  static setCurrentPrice(cropId: string, price: number) {
    if (!cropId) return;
    const n = Math.round(Number(price));
    if (!Number.isFinite(n) || n <= 0) return;
    this.priceOverrides[cropId] = n;
    this.saveOverrides();
  }

  /** Remove a current-price override for a crop (reverts to dynamic). */
  static clearCurrentPrice(cropId: string) {
    if (!cropId) return;
    delete this.priceOverrides[cropId];
    this.saveOverrides();
  }

  /** Read current-price override for a crop, if any. */
  static getCurrentPriceOverride(cropId: string): number | undefined {
    return this.priceOverrides[cropId];
  }

  /** Optional: bulk set many current prices at once. */
  static upsertCurrentPrices(overrides: Record<string, number>) {
    for (const [k, v] of Object.entries(overrides)) {
      const n = Math.round(Number(v));
      if (Number.isFinite(n) && n > 0) this.priceOverrides[k] = n;
    }
    this.saveOverrides();
  }

  /** Optional: let UI tweak the default base price table as well. */
  static setBasePrice(cropId: string, price: number) {
    const n = Math.round(Number(price));
    if (!cropId || !Number.isFinite(n) || n <= 0) return;
    this.baseprices[cropId] = n;
  }

  static getBasePrice(cropId: string): number | undefined {
    return this.baseprices[cropId];
  }

  /* --------------------------------------------------------------------------- */

  static async getCurrentPrices(): Promise<MarketPrice[]> {
    const markets = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad'];
    const crops = Object.keys(this.baseprices);

    return crops.map((cropId) => {
      const basePrice = this.baseprices[cropId];
      const override = this.priceOverrides[cropId];

      // if user set a current price, use it; else keep your original randomized behavior
      const variation = (Math.random() - 0.5) * 0.2; // ±10%
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
