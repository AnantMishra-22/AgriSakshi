import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Minus, IndianRupee, BarChart3, Lightbulb,
  Pencil, Check, X, Undo2
} from "lucide-react";
import { MarketService, MarketPrice, MarketTrend } from '@/services/marketService';
import { LanguageService } from '@/services/languageService';
import { LocationData } from '@/services/locationService';
import { CurrentWeather } from '@/services/weatherService';

interface MarketTabProps {
  location: LocationData | null;
  currentWeather: CurrentWeather | null;
}

export const MarketTab = ({ location, currentWeather }: MarketTabProps) => {
  const [currentPrices, setCurrentPrices] = useState<MarketPrice[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('rice');
  const [cropTrend, setCropTrend] = useState<MarketTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [language] = useState(LanguageService.getCurrentLanguage());

  // NEW: edit mode + per-crop input values
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const t = (key: string) => LanguageService.getTranslation(key) || key;

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
      let prices: MarketPrice[];
      if (location) {
        prices = await MarketService.getPricesByLocation(location.latitude, location.longitude);
      } else {
        prices = await MarketService.getCurrentPrices();
      }
      const top = prices.slice(0, 10); // Show top 10 crops
      setCurrentPrices(top);
      initEditValues(top);

      // Load trend for selected crop
      const trend = await MarketService.getMarketTrends(selectedCrop);
      setCropTrend(trend);
    } catch (error) {
      console.error('Market data loading failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCropTrend = async (cropId: string) => {
    setSelectedCrop(cropId);
    try {
      const trend = await MarketService.getMarketTrends(cropId);
      setCropTrend(trend);
    } catch (error) {
      console.error('Crop trend loading failed:', error);
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getMarketInsights = () => {
    if (!currentWeather) return [];
    return MarketService.getMarketInsights(selectedCrop, currentWeather);
  };

  // NEW: helpers for overrides
  const hasOverride = (cropId: string) =>
    typeof MarketService.getCurrentPriceOverride(cropId) === 'number';

  const handleEditValueChange = (cropId: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [cropId]: value }));
  };

  const saveOverride = async (cropId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const raw = editValues[cropId];
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n <= 0) return;
    MarketService.setCurrentPrice(cropId, n);
    await loadMarketData(); // refresh list (keeps edit mode on)
  };

  const clearOverride = async (cropId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    MarketService.clearCurrentPrice(cropId);
    await loadMarketData();
  };

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
      {/* Add a subtle overlay for readability */}
      {/*<div className="absolute inset-0 bg-black/20 pointer-events-none" />*/}
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <IndianRupee className="w-6 h-6 text-success" />
          {t('marketTrends')}
        </h1>
        <p className="text-muted-foreground">{t('priceAnalysis')}</p>
      </div>

      <Tabs defaultValue="prices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prices">{t('currentPrices')}</TabsTrigger>
          <TabsTrigger value="trends">Trends & Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="space-y-4">
          {/* Current Prices */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                {t('currentPrices')}
              </h3>

              <div className="flex items-center gap-2">
                {/* NEW: toggle edit mode */}
                <Button
                  onClick={() => setEditMode((v) => !v)}
                  variant={editMode ? 'default' : 'outline'}
                  size="sm"
                >
                  {editMode ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" /> Done
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Pencil className="w-4 h-4" /> Edit Prices
                    </span>
                  )}
                </Button>

                <Button 
                  onClick={loadMarketData} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? t('loading') : t('refresh')}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {currentPrices.map((price) => (
                <div 
                  key={price.cropId}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Row: clickable to load trend (keep original behavior) */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => !editMode && loadCropTrend(price.cropId)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        {price.cropName}
                        {hasOverride(price.cropId) && (
                          <Badge variant="default" className="text-xs">Overridden</Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">{price.market}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(price.currentPrice)}/quintal</p>
                      <div className={`flex items-center gap-1 text-sm ${getPriceChangeColor(price.priceChange)}`}>
                        {getPriceChangeIcon(price.priceChange)}
                        <span>{Math.abs(price.priceChange).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Badge variant={
                        price.demandTrend === 'increasing' ? 'default' : 
                        price.demandTrend === 'decreasing' ? 'destructive' : 
                        'secondary'
                      }>
                        {price.demandTrend}
                      </Badge>
                    </div>
                  </div>

                  {/* NEW: inline editor visible in edit mode */}
                  {editMode && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground min-w-[110px]">
                          Set current price
                        </label>
                        <div className="flex items-center gap-2 w-full">
                          <div className="text-muted-foreground">₹</div>
                          <Input
                            value={editValues[price.cropId] ?? ''}
                            onChange={(e) => handleEditValueChange(price.cropId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Enter price (₹/quintal)"
                            className="max-w-[180px]"
                            inputMode="numeric"
                          />
                          <span className="text-sm text-muted-foreground">/quintal</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => saveOverride(price.cropId, e)}
                        className="justify-self-start md:justify-self-end"
                      >
                        <Check className="w-4 h-4 mr-1" /> Save
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => clearOverride(price.cropId, e)}
                        className="justify-self-start md:justify-self-end"
                      >
                        <Undo2 className="w-4 h-4 mr-1" /> Reset
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Crop Selection */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Select Crop for Detailed Analysis</h3>
            <div className="grid grid-cols-3 gap-2">
              {['rice', 'wheat', 'maize', 'cotton', 'sugarcane', 'groundnut'].map((crop) => (
                <Button
                  key={crop}
                  variant={selectedCrop === crop ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => loadCropTrend(crop)}
                  className="capitalize"
                >
                  {crop}
                </Button>
              ))}
            </div>
          </Card>

          {/* Crop Trend Details */}
          {cropTrend && (
            <>
              <Card className="p-4">
                <h3 className="font-semibold mb-4">{cropTrend.cropName} - Price Analysis</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Price</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatPrice(cropTrend.averagePrice)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-success/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">Peak Season</p>
                    <p className="text-lg font-semibold text-success">
                      {cropTrend.peakSeason}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Monthly Price Pattern (Current Year)</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {cropTrend.monthlyPrices.slice(0, 8).map((month) => (
                      <div key={month.month} className="text-center p-2 bg-muted/20 rounded">
                        <p className="text-xs text-muted-foreground">{month.month}</p>
                        <p className="text-sm font-medium">₹{month.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">Price Forecast (Next 6 Months)</h3>
                <div className="space-y-3">
                  {cropTrend.forecastPrices.map((forecast) => (
                    <div key={forecast.month} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                      <span className="font-medium">{forecast.month}</span>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(forecast.price)}</p>
                        <p className="text-sm text-muted-foreground">
                          {forecast.confidence}% confidence
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-info/5 rounded-lg">
                  <p className="text-sm text-info">{cropTrend.seasonalPattern}</p>
                </div>
              </Card>
            </>
          )}

          {/* Market Insights */}
          <Card className="p-4">
            <h3 className="font-semibold flex items-center mb-3">
              <Lightbulb className="w-5 h-5 mr-2 text-warning" />
              {t('marketInsights')}
            </h3>
            <div className="space-y-2">
              {getMarketInsights().map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-warning rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{insight}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
};
