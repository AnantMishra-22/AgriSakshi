import { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wheat, 
  Search, 
  TrendingUp, 
  Calendar, 
  Star,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  IndianRupee
} from "lucide-react";
import { RecommendationService, CropRecommendation, RecommendationResult } from '@/services/recommendationService';
import { SoilData, SoilService } from '@/services/soilService'; // ⬅️ import SoilService to read soil type info
import { CurrentWeather, WeatherForecast } from '@/services/weatherService';
import { LocationData } from '@/services/locationService';
import { crops, Crop, getCropsByCategory, searchCrops } from '@/data/crops';
import { CropGuide } from '../CropGuide';
import { useLanguage } from '@/services/languageService';

interface CropTabProps {
  location: LocationData | null;
  soilData: SoilData | null;
  currentWeather: CurrentWeather | null;
  forecast: WeatherForecast[];
}

export const CropTab = ({ location, soilData, currentWeather, forecast }: CropTabProps) => {
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const { t } = useLanguage();

  // ---------- NEW: Local scoring helpers (lightweight, deterministic) ----------
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const pct = (x: number) => Math.round(clamp01(x) * 100);

  // closeness of value to a [min,max] range — peak at center, linear falloff with slack
  const closenessToRange = (value: number, min: number, max: number, slack: number) => {
    const center = (min + max) / 2;
    const half = (max - min) / 2 + slack;
    if (half <= 0) return value === center ? 1 : 0;
    return clamp01(1 - Math.abs(value - center) / half);
  };

  // Weekly rainfall (cm) from 7-day forecast (Open-Meteo daily.precipitation_sum in mm/day)
  const weeklyRainCm = useMemo(() => {
    if (!forecast || forecast.length === 0) return 0;
    const mm = forecast.reduce((s, d) => s + (Number(d.rainfall) || 0), 0);
    return mm / 10; // mm → cm
  }, [forecast]);

  // Mean daily temperature for next 7 days (fallback to current)
  const meanTemp = useMemo(() => {
    if (forecast && forecast.length > 0) {
      const vals = forecast.map(d => {
        const max = Number(d.maxTemp) || NaN;
        const min = Number(d.minTemp) || NaN;
        if (Number.isFinite(max) && Number.isFinite(min)) return (max + min) / 2;
        return NaN;
      }).filter(v => Number.isFinite(v)) as number[];
      if (vals.length) return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    return currentWeather ? Number(currentWeather.temperature) || 0 : 0;
  }, [forecast, currentWeather]);

  // Pull soil type details for crop suitability bonus
  const currentSoilTypeInfo = useMemo(() => {
    if (!soilData) return null;
    try {
      return SoilService.getSoilTypes().find(s => s.name.toLowerCase() === soilData.type.toLowerCase()) || null;
    } catch {
      return null;
    }
  }, [soilData]);

  // Suitability scoring per crop
  const scoreCrop = (crop: Crop): { score: number; parts: Record<string, number>; notes: string[] } => {
    // Temperature fitness (target: crop.ideal_temp [°C])
    const [tmin, tmax] = crop.ideal_temp || [20, 35];
    const tempFit = closenessToRange(meanTemp, tmin, tmax, 5); // 5°C slack

    // Rainfall fitness (approximate weekly need ≈ seasonal need / 12)
    const [rMinSeasonCm, rMaxSeasonCm] = crop.rainfall_need || [40, 120]; // cm over crop cycle
    const weeklyMin = rMinSeasonCm / 12;
    const weeklyMax = rMaxSeasonCm / 12;
    const rainFit = closenessToRange(weeklyRainCm, weeklyMin, weeklyMax, 1); // 1 cm slack

    // Soil crop fit (bonus if soil type lists the crop in suitableCrops)
    let soilCropFit = 0.7; // base
    const notes: string[] = [];
    if (currentSoilTypeInfo) {
      const match = (currentSoilTypeInfo.suitableCrops || []).some(
        sc => sc.toLowerCase() === crop.name.toLowerCase()
      );
      if (match) {
        soilCropFit = 1.0;
        notes.push(`Suited to ${currentSoilTypeInfo.name} soils`);
      } else {
        notes.push(`Works in ${currentSoilTypeInfo.name} with management`);
      }
    }

    // pH fit — closeness of actual soil pH to soil type’s pH range
    let phFit = 0.8;
    if (soilData && currentSoilTypeInfo) {
      const [spMin, spMax] = currentSoilTypeInfo.pH_range || [6.0, 7.5];
      phFit = closenessToRange(soilData.pH, spMin, spMax, 0.5);
      if (phFit >= 0.8) notes.push(`pH ${soilData.pH} ok for local soils`);
      else notes.push(`pH ${soilData.pH} needs adjustment for best results`);
    }

    // Profit weight from crop.profit_potential
    const profitWeight = crop.profit_potential === 'high' ? 1.05 : crop.profit_potential === 'low' ? 0.95 : 1.0;

    // Weighted blend
    const wTemp = 0.35, wRain = 0.30, wSoil = 0.20, wPH = 0.15;
    const blended = (wTemp * tempFit + wRain * rainFit + wSoil * soilCropFit + wPH * phFit) * profitWeight;

    return {
      score: pct(blended),
      parts: { tempFit, rainFit, soilCropFit, phFit },
      notes
    };
  };

  // Build RecommendationResult compatible object the UI already consumes
  const buildRecommendations = (): RecommendationResult => {
    const items: CropRecommendation[] = crops.map((crop) => {
      const { score, parts, notes } = scoreCrop(crop);

      // Expected yield text by score band
      const expectedYield =
        score >= 85 ? 'High (A+)' :
        score >= 70 ? 'Good (A)' :
        score >= 55 ? 'Moderate (B)' :
        'Low (C)';

      // Windows (light heuristics)
      const start = new Date();
      const sowStart = start.toLocaleDateString();
      const sowEnd = new Date(start.getTime() + 14 * 86400000).toLocaleDateString();
      const durMin = crop.duration_days?.[0] ?? 90;
      const durMax = crop.duration_days?.[1] ?? 120;
      const harvStart = new Date(start.getTime() + durMin * 86400000).toLocaleDateString();
      const harvEnd = new Date(start.getTime() + durMax * 86400000).toLocaleDateString();

      // Advantages / Risks snippets
      const advantages: string[] = [];
      const risks: string[] = [];
      if (parts.tempFit >= 0.8) advantages.push('Temperature near ideal range');
      else risks.push('Temperature not in ideal range');
      if (parts.rainFit >= 0.8) advantages.push('Forecast rainfall adequate this week');
      else risks.push('Forecast rainfall may be insufficient');
      if (parts.soilCropFit >= 0.9) advantages.push('Matches local soil type');
      if (parts.phFit < 0.6) risks.push('Soil pH not optimal');

      return {
        crop,
        score,
        expectedYield,
        sowingWindow: `${sowStart} – ${sowEnd}`,
        harvestWindow: `${harvStart} – ${harvEnd}`,
        advantages,
        risks,
        rationale: notes
      } as CropRecommendation;
    })
    .sort((a, b) => b.score - a.score);

    // Seasonal grouping (simple: current season only)
    const month = new Date().getMonth() + 1;
    const season = month >= 6 && month <= 10 ? 'kharif' : month >= 11 || month <= 3 ? 'rabi' : 'zaid';
    const seasonalRecommendations: Record<string, CropRecommendation[]> = {
      kharif: season === 'kharif' ? items.slice(0, 5) : [],
      rabi: season === 'rabi' ? items.slice(0, 5) : [],
      zaid: season === 'zaid' ? items.slice(0, 5) : []
    };

    return {
      bestCrop: items[0],
      topCrops: items.slice(0, 5),
      seasonalRecommendations
    } as RecommendationResult;
  };

  const generateRecommendations = async () => {
    if (!location || !soilData || !currentWeather) {
      setRecommendations(null);
      return;
    }
    setLoading(true);
    try {
      // Prefer our deterministic local scorer to avoid NaN and ensure ordering
      const result = buildRecommendations();

      // (Optional) If you still want to keep your existing service as fallback:
      // const result = RecommendationService.generateRecommendations(soilData, currentWeather, forecast, location) ?? buildRecommendations();

      setRecommendations(result);
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, soilData, currentWeather, forecast]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'secondary';
  };

  const getProfitColor = (profit: string) => {
    switch (profit) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const filteredCrops = searchQuery 
    ? searchCrops(searchQuery)
    : selectedCategory === 'all' 
      ? crops 
      : getCropsByCategory(selectedCategory as any);

  const categories = [
    { id: 'all', label: 'All Crops', count: crops.length },
    { id: 'cereal', label: 'Cereals', count: getCropsByCategory('cereal').length },
    { id: 'pulse', label: 'Pulses', count: getCropsByCategory('pulse').length },
    { id: 'oilseed', label: 'Oilseeds', count: getCropsByCategory('oilseed').length },
    { id: 'cash', label: 'Cash Crops', count: getCropsByCategory('cash').length },
    { id: 'vegetable', label: 'Vegetables', count: getCropsByCategory('vegetable').length },
    { id: 'fruit', label: 'Fruits', count: getCropsByCategory('fruit').length }
  ];

  const CropCard = ({ crop, recommendation }: { crop: Crop, recommendation?: CropRecommendation }) => (
    <Card className="p-4 shadow-soft hover:shadow-strong transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{crop.name}</h3>
          <Badge variant="outline" className="text-xs">{crop.category}</Badge>
        </div>
        {recommendation && (
          <Badge variant={getScoreColor(recommendation.score) as any}>
            {recommendation.score}%
          </Badge>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Duration:</span>
          <span>{crop.duration_days[0]}-{crop.duration_days[1]} days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Temperature:</span>
          <span>{crop.ideal_temp[0]}-{crop.ideal_temp[1]}°C</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Rainfall:</span>
          <span>{crop.rainfall_need[0]}-{crop.rainfall_need[1]}cm</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Profit Potential:</span>
          <Badge variant={getProfitColor(crop.profit_potential) as any} className="text-xs">
            {crop.profit_potential}
          </Badge>
        </div>
      </div>

      {recommendation && (
        <div className="mt-3 pt-3 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expected Yield:</span>
              <span className="font-medium">{recommendation.expectedYield}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sowing Window:</span>
              <span>{recommendation.sowingWindow}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Harvest Window:</span>
              <span>{recommendation.harvestWindow}</span>
            </div>
          </div>

          {recommendation.advantages.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-success mb-1">Advantages:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {recommendation.advantages.slice(0, 2).map((advantage, idx) => (
                  <li key={idx} className="flex items-start space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                    <span>{advantage}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.risks.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-warning mb-1">Considerations:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {recommendation.risks.slice(0, 1).map((risk, idx) => (
                  <li key={idx} className="flex items-start space-x-1">
                    <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSelectedCrop(crop)}
          className="flex-1"
        >
          <BookOpen className="w-4 h-4 mr-1" />
          View Guide
        </Button>
      </div>
    </Card>
  );

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center">
          <Wheat className="w-6 h-6 mr-2 text-primary" />
          Crop Recommendations
        </h2>
        <p className="text-muted-foreground">AI-powered crop selection for your farm</p>
      </div>

      {/* Best Crop Recommendation */}
      {recommendations?.bestCrop && (
        <Card className="p-6 bg-gradient-primary shadow-strong">
          <div className="text-center text-white space-y-4">
            <div className="p-3 bg-white/20 rounded-full w-fit mx-auto">
              <Star className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Best Crop for You</h3>
              <h2 className="text-3xl font-bold">{recommendations.bestCrop.crop.name}</h2>
              <Badge variant="secondary" className="mt-2">
                {recommendations.bestCrop.score}% Match
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <Clock className="w-5 h-5 mx-auto mb-1" />
                <p>Duration</p>
                <p className="font-semibold">
                  {recommendations.bestCrop.crop.duration_days[0]}-{recommendations.bestCrop.crop.duration_days[1]} days
                </p>
              </div>
              <div className="text-center">
                <IndianRupee className="w-5 h-5 mx-auto mb-1" />
                <p>Profit Potential</p>
                <p className="font-semibold capitalize">
                  {recommendations.bestCrop.crop.profit_potential}
                </p>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-3 text-left">
              <p className="font-medium mb-2">Why this crop?</p>
              <ul className="text-sm space-y-1">
                {recommendations.bestCrop.rationale.slice(0, 2).map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {selectedCrop ? (
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedCrop(null)}
            className="mb-4"
          >
            ← Back to Crops
          </Button>
          <CropGuide crop={selectedCrop} />
        </div>
      ) : (
        <Tabs defaultValue="recommendations">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="browse">Browse Crops</TabsTrigger>
          </TabsList>

          {/* AI Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {loading ? (
              <Card className="p-8 text-center">
                <div className="animate-pulse space-y-2">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <p>Analyzing your conditions...</p>
                  <p className="text-sm text-muted-foreground">
                    Considering soil, weather, and seasonal factors
                  </p>
                </div>
              </Card>
            ) : recommendations ? (
              <div className="space-y-4">
                {/* Top 5 Recommendations */}
                <div>
                  <h3 className="font-semibold mb-3">Top Recommendations</h3>
                  <div className="grid gap-4">
                    {recommendations.topCrops.map((rec) => (
                      <CropCard 
                        key={rec.crop.id} 
                        crop={rec.crop} 
                        recommendation={rec}
                      />
                    ))}
                  </div>
                </div>

                {/* Seasonal Recommendations */}
                <div>
                  <h3 className="font-semibold mb-3">Seasonal Recommendations</h3>
                  <div className="space-y-4">
                    {Object.entries(recommendations.seasonalRecommendations).map(([season, crops]) => (
                      crops.length > 0 && (
                        <Card key={season} className="p-4 shadow-soft">
                          <h4 className="font-medium capitalize mb-3 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {season} Season
                          </h4>
                          <div className="grid gap-3">
                            {crops.slice(0, 3).map((rec) => (
                              <div key={rec.crop.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                <div>
                                  <p className="font-medium">{rec.crop.name}</p>
                                  <p className="text-xs text-muted-foreground">{rec.expectedYield}</p>
                                </div>
                                <Badge variant={getScoreColor(rec.score) as any}>
                                  {rec.score}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="space-y-2">
                  <AlertTriangle className="w-8 h-8 text-warning mx-auto" />
                  <p>Unable to generate recommendations</p>
                  <p className="text-sm text-muted-foreground">
                    Please ensure location, soil, and weather data are available
                  </p>
                  <Button onClick={generateRecommendations} disabled={loading}>
                    Try Again
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Browse Crops Tab */}
          <TabsContent value="browse" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search crops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label} ({category.count})
                </Button>
              ))}
            </div>

            {/* Crop Grid */}
            <div className="grid gap-4">
              {filteredCrops.map((crop) => (
                <CropCard key={crop.id} crop={crop} />
              ))}
            </div>

            {filteredCrops.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No crops found matching your criteria</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
    </div>
  );
};
