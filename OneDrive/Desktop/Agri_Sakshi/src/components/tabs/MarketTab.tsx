// src/components/tabs/MarketTab.tsx
// Market prices with Recharts price chart visualization.
// Shows live Agmarknet data where available, AI estimates otherwise.

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, Minus, IndianRupee, BarChart3, Lightbulb,
  Pencil, Check, Undo2, Database, Sparkles, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { MarketService, MarketPrice, MarketTrend } from '@/services/marketService';
import { LanguageService } from '@/services/languageService';
import { LocationData } from '@/services/locationService';
import { CurrentWeather } from '@/services/weatherService';

interface MarketTabProps {
  location: LocationData | null;
  currentWeather: CurrentWeather | null;
}

const PriceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const conf = payload[0]?.payload?.confidence;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p style={{ color: payload[0]?.color }}>
        Price: ₹{Number(payload[0]?.value).toLocaleString('en-IN')}
      </p>
      {conf != null && <p className="text-muted-foreground">Confidence: {conf}%</p>}
    </div>
  );
};

export const MarketTab = ({ location, currentWeather }: MarketTabProps) => {
  const [currentPrices, setCurrentPrices] = useState<MarketPrice[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('rice');
  const [cropTrend, setCropTrend] = useState<MarketTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const t = (key: string) => LanguageService.getTranslation(key) || key;

  const getWeatherSummary = (): string => {
    if (!currentWeather) return 'weather data unavailable';
    return `${currentWeather.temperature}°C, humidity ${currentWeather.humidity}%, rainfall ${currentWeather.rainfall}mm, condition: ${currentWeather.condition}`;
  };

  useEffect(() => {
    loadMarketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const initEditValues = (prices: MarketPrice[]) => {
    const values: Record<string, string> = {};
    prices.forEach((p) => {
      const ov = MarketService.getCurrentPriceOverride(p.cropId);
      values[p.cropId] = String(ov ?? p.currentPrice);
    });
    setEditValues(values);
  };

  const loadMarketData = async () => {
    setLoading(true);
    try {
      const ws = getWeatherSummary();
      const prices = location
        ? await MarketService.getPricesByLocation(location.latitude, location.longitude, ws)
        : await MarketService.getCurrentPrices(ws);
      const top = prices.slice(0, 12);
      setCurrentPrices(top);
      initEditValues(top);
      await loadCropTrend(selectedCrop);
    } catch (err) {
      console.error('Market data loading failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCropTrend = async (cropId: string) => {
    setSelectedCrop(cropId);
    setTrendLoading(true);
    try {
      const trend = await MarketService.getMarketTrends(cropId);
      setCropTrend(trend);
    } catch (err) {
      console.error('Trend load failed:', err);
    } finally {
      setTrendLoading(false);
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

  const hasOverride = (cropId: string) =>
    typeof MarketService.getCurrentPriceOverride(cropId) === 'number';

  const handleEditValueChange = (cropId: string, value: string) =>
    setEditValues((prev) => ({ ...prev, [cropId]: value }));

  const saveOverride = async (cropId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const n = Math.round(Number(editValues[cropId]));
    if (!Number.isFinite(n) || n <= 0) return;
    MarketService.setCurrentPrice(cropId, n);
    await loadMarketData();
  };

  const clearOverride = async (cropId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    MarketService.clearCurrentPrice(cropId);
    await loadMarketData();
  };

  const getSourceBadge = (source: MarketPrice['source']) => {
    if (source === 'agmarknet')
      return <Badge variant="outline" className="text-xs border-green-400 text-green-700 flex items-center gap-1"><Database className="w-3 h-3" /> Live</Badge>;
    if (source === 'user_override')
      return <Badge variant="default" className="text-xs">Your Price</Badge>;
    return <Badge variant="outline" className="text-xs border-blue-400 text-blue-700 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Est.</Badge>;
  };

  // Chart data
  const priceBarData = currentPrices.slice(0, 8).map((p) => ({
    name: p.cropName.split(' ')[0],
    current: p.currentPrice,
    predicted: p.predictedPrice,
  }));

  const monthlyChartData = cropTrend?.monthlyPrices.map((m) => ({ month: m.month, price: m.price })) ?? [];

  const forecastChartData = cropTrend
    ? [
        ...cropTrend.monthlyPrices.slice(-2).map((m) => ({
          month: m.month, actual: m.price, forecast: null as number | null, confidence: null as number | null,
        })),
        ...cropTrend.forecastPrices.map((f) => ({
          month: f.month, actual: null as number | null, forecast: f.price, confidence: f.confidence,
        })),
      ]
    : [];

  const cropButtons = ['rice', 'wheat', 'maize', 'cotton', 'onion', 'groundnut', 'tomato', 'sugarcane', 'soybean'];

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
      <div className="p-4 space-y-6 pb-20">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <IndianRupee className="w-6 h-6 text-green-600" />
            Market Prices
          </h1>
          <p className="text-muted-foreground text-sm">Live mandi prices · AI-powered forecasts</p>
          {currentWeather && (
            <p className="text-xs text-muted-foreground">
              📍 Weather-adjusted: {currentWeather.temperature}°C, {currentWeather.condition}
            </p>
          )}
        </div>

        <Tabs defaultValue="prices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prices">Current Prices</TabsTrigger>
            <TabsTrigger value="trends">Charts & Forecast</TabsTrigger>
          </TabsList>

          {/* ── Current Prices tab ── */}
          <TabsContent value="prices" className="space-y-4">
            {priceBarData.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Price Overview (₹/quintal)
                </h3>
                <ResponsiveContainer width="100%" height={175}>
                  <ComposedChart data={priceBarData} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<PriceTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="current" name="Current" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="predicted" name="3-Month" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.7} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            )}

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> All Crops
                </h3>
                <div className="flex gap-2">
                  <Button onClick={() => setEditMode((v) => !v)} variant={editMode ? 'default' : 'outline'} size="sm">
                    {editMode ? <><Check className="w-4 h-4 mr-1" />Done</> : <><Pencil className="w-4 h-4 mr-1" />Edit</>}
                  </Button>
                  <Button onClick={loadMarketData} disabled={loading} variant="outline" size="sm">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Database className="w-3 h-3 text-green-600" />Live = Agmarknet</span>
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-600" />AI Est. = Claude</span>
              </div>

              <div className="space-y-2">
                {currentPrices.map((price) => (
                  <div key={price.cropId} className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => !editMode && loadCropTrend(price.cropId)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                          {price.cropName}
                          {getSourceBadge(price.source)}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{price.market}</p>
                      </div>
                      <div className="text-right mx-3">
                        <p className="font-semibold text-sm">{formatPrice(price.currentPrice)}</p>
                        <div className={`flex items-center justify-end gap-0.5 text-xs ${getPriceChangeColor(price.priceChange)}`}>
                          {getPriceChangeIcon(price.priceChange)}
                          {Math.abs(price.priceChange).toFixed(1)}%
                        </div>
                      </div>
                      <Badge
                        variant={price.demandTrend === 'increasing' ? 'default' : price.demandTrend === 'decreasing' ? 'destructive' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {price.demandTrend}
                      </Badge>
                    </div>

                    {editMode && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Set price (₹/q):</span>
                        <Input
                          value={editValues[price.cropId] ?? ''}
                          onChange={(e) => handleEditValueChange(price.cropId, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-28 h-8 text-sm"
                          inputMode="numeric"
                        />
                        <Button size="sm" className="h-8" onClick={(e) => saveOverride(price.cropId, e)}>
                          <Check className="w-3 h-3 mr-1" />Save
                        </Button>
                        {hasOverride(price.cropId) && (
                          <Button size="sm" variant="outline" className="h-8" onClick={(e) => clearOverride(price.cropId, e)}>
                            <Undo2 className="w-3 h-3 mr-1" />Reset
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ── Charts & Forecast tab ── */}
          <TabsContent value="trends" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Select Crop for Analysis</h3>
              <div className="grid grid-cols-3 gap-2">
                {cropButtons.map((crop) => (
                  <Button
                    key={crop}
                    variant={selectedCrop === crop ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => loadCropTrend(crop)}
                    className="capitalize text-xs"
                    disabled={trendLoading}
                  >
                    {crop}
                  </Button>
                ))}
              </div>
            </Card>

            {trendLoading && (
              <Card className="p-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Fetching AI price analysis…</p>
              </Card>
            )}

            {cropTrend && !trendLoading && (
              <>
                {/* Stats */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">{cropTrend.cropName}</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-primary/5 rounded-lg">
                      <p className="text-xs text-muted-foreground">Annual Avg</p>
                      <p className="text-sm font-bold text-primary">₹{cropTrend.averagePrice.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Peak</p>
                      <p className="text-sm font-bold text-green-700">{cropTrend.peakSeason}</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Low</p>
                      <p className="text-sm font-bold text-orange-700">{cropTrend.lowSeason}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{cropTrend.seasonalPattern}</p>
                </Card>

                {/* Monthly price area chart */}
                {monthlyChartData.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Monthly Price Pattern (₹/quintal)
                    </h3>
                    <ResponsiveContainer width="100%" height={195}>
                      <AreaChart data={monthlyChartData} margin={{ top: 5, right: 8, left: -12, bottom: 4 }}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<PriceTooltip />} />
                        <ReferenceLine
                          y={cropTrend.averagePrice}
                          stroke="#94a3b8"
                          strokeDasharray="4 3"
                          label={{ value: 'Avg', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          name="Price"
                          stroke="#16a34a"
                          strokeWidth={2}
                          fill="url(#priceGrad)"
                          dot={{ r: 3, fill: '#16a34a' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Forecast chart */}
                {forecastChartData.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      6-Month AI Forecast
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">Confidence bars show forecast reliability</p>
                    <ResponsiveContainer width="100%" height={190}>
                      <ComposedChart data={forecastChartData} margin={{ top: 5, right: 8, left: -12, bottom: 4 }}>
                        <defs>
                          <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ForecastTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="actual" name="Historical" stroke="#16a34a" strokeWidth={2} fill="none" dot={{ r: 4, fill: '#16a34a' }} connectNulls={false} />
                        <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" fill="url(#fcGrad)" dot={{ r: 3, fill: '#3b82f6' }} connectNulls={false} />
                      </ComposedChart>
                    </ResponsiveContainer>

                    <div className="mt-3 space-y-1.5">
                      {cropTrend.forecastPrices.map((f) => (
                        <div key={f.month} className="flex justify-between items-center text-sm px-2 py-1.5 rounded bg-muted/20">
                          <span className="font-medium w-20">{f.month}</span>
                          <span className="font-semibold">₹{f.price.toLocaleString('en-IN')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.confidence}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{f.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Insights */}
                <Card className="p-4">
                  <h3 className="font-semibold flex items-center mb-3">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    Market Insights
                  </h3>
                  <div className="space-y-2">
                    {MarketService.getMarketInsights(selectedCrop, currentWeather ?? {}).map((insight, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{insight}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
