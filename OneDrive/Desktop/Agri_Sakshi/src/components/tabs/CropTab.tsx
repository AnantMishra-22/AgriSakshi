import { useState, useEffect } from 'react';
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
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  IndianRupee,
  Beaker,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  RecommendationService,
  CropRecommendation,
  RecommendationResult,
  ChemicalTestData,
} from '@/services/recommendationService';
import { SoilData } from '@/services/soilService';
import { CurrentWeather, WeatherForecast } from '@/services/weatherService';
import { LocationData } from '@/services/locationService';
import { crops, Crop, getCropsByCategory, searchCrops } from '@/data/crops';
import { CropGuide } from '../CropGuide';
import { useLanguage } from '@/services/languageService';

interface CropTabProps {
  location:       LocationData | null;
  soilData:       SoilData | null;
  currentWeather: CurrentWeather | null;
  forecast:       WeatherForecast[];
  chemical?:      ChemicalTestData | null;  // optional — passed when tests are done
}

export const CropTab = ({
  location,
  soilData,
  currentWeather,
  forecast,
  chemical,
}: CropTabProps) => {
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const { t } = useLanguage();

  const generateRecommendations = async (forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh) RecommendationService.clearCache();
    try {
      const result = await RecommendationService.generateRecommendations(
        soilData,
        currentWeather,
        forecast,
        location,
        chemical ?? null
      );
      setRecommendations(result);
    } catch (err) {
      console.error('Recommendation generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, soilData, currentWeather, forecast, chemical]);

  const getScoreColor = (score: number) =>
    score >= 80 ? 'success' : score >= 60 ? 'warning' : 'secondary';

  const getProfitColor = (profit: string) =>
    profit === 'high' ? 'success' : profit === 'medium' ? 'warning' : 'secondary';

  const filteredCrops = searchQuery
    ? searchCrops(searchQuery)
    : selectedCategory === 'all'
      ? crops
      : getCropsByCategory(selectedCategory as any);

  const categories = [
    { id: 'all',       label: 'All Crops',  count: crops.length },
    { id: 'cereal',    label: 'Cereals',    count: getCropsByCategory('cereal').length },
    { id: 'pulse',     label: 'Pulses',     count: getCropsByCategory('pulse').length },
    { id: 'oilseed',   label: 'Oilseeds',   count: getCropsByCategory('oilseed').length },
    { id: 'cash',      label: 'Cash Crops', count: getCropsByCategory('cash').length },
    { id: 'vegetable', label: 'Vegetables', count: getCropsByCategory('vegetable').length },
    { id: 'fruit',     label: 'Fruits',     count: getCropsByCategory('fruit').length },
  ];

  // ── Data quality banner ──────────────────────────────────────────────────────
  const DataBanner = () => {
    const dq = recommendations?.dataQuality;
    if (!dq) return null;
    const all = dq.hasWeather && dq.hasSoil && dq.hasLocation;
    const missing: string[] = [];
    if (!dq.hasLocation) missing.push('location');
    if (!dq.hasSoil)     missing.push('soil data');
    if (!dq.hasWeather)  missing.push('weather data');

    return (
      <Card className={`p-3 ${all ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-2">
          <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${all ? 'text-green-600' : 'text-amber-600'}`} />
          <div className="text-xs">
            <div className="flex flex-wrap gap-1 mb-1">
              {[
                { label: 'Location', ok: dq.hasLocation },
                { label: 'Soil',     ok: dq.hasSoil },
                { label: 'Weather',  ok: dq.hasWeather },
                { label: 'Chemical', ok: dq.hasChemical },
              ].map(({ label, ok }) => (
                <span
                  key={label}
                  className={`px-1.5 py-0.5 rounded text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                >
                  {ok ? '✓' : '○'} {label}
                </span>
              ))}
            </div>
            {missing.length > 0 && (
              <p className="text-amber-700">
                Missing: {missing.join(', ')}. Add these for better recommendations.
                {!dq.hasChemical && ' Run chemical tests in the Soil tab for highest accuracy.'}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // ── Crop card ────────────────────────────────────────────────────────────────
  const CropCard = ({ crop, recommendation }: { crop: Crop; recommendation?: CropRecommendation }) => (
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
                {recommendation.advantages.slice(0, 2).map((a, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.risks.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-warning mb-1">Considerations:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {recommendation.risks.slice(0, 2).map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedCrop(crop)} className="w-full">
          <BookOpen className="w-4 h-4 mr-1" />
          View Guide
        </Button>
      </div>
    </Card>
  );

  // ── Main render ──────────────────────────────────────────────────────────────
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
          <p className="text-muted-foreground">AI-powered crop selection based on your field data</p>
        </div>

        {/* Best Crop Hero card */}
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
                  <p className="font-semibold capitalize">{recommendations.bestCrop.crop.profit_potential}</p>
                </div>
              </div>

              {/* AI Narrative */}
              {recommendations.aiNarrative && (
                <div className="bg-white/10 rounded-lg p-3 text-left">
                  <p className="font-medium mb-1 text-sm">AI Analysis</p>
                  <p className="text-sm opacity-90">{recommendations.aiNarrative}</p>
                </div>
              )}

              {/* Chemical insights */}
              {recommendations.chemicalInsights && (
                <div className="bg-white/10 rounded-lg p-3 text-left flex items-start gap-2">
                  <Beaker className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm opacity-90">{recommendations.chemicalInsights}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {selectedCrop ? (
          <div className="space-y-4">
            <Button variant="outline" onClick={() => setSelectedCrop(null)} className="mb-4">
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

            {/* ── AI Recommendations tab ── */}
            <TabsContent value="recommendations" className="space-y-4">
              <DataBanner />

              {/* Refresh button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateRecommendations(true)}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Analysing...' : 'Refresh Analysis'}
                </Button>
              </div>

              {loading ? (
                <Card className="p-8 text-center">
                  <div className="animate-pulse space-y-2">
                    <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                      <TrendingUp className="w-8 h-8 text-primary" />
                    </div>
                    <p>Analysing your conditions with AI...</p>
                    <p className="text-sm text-muted-foreground">
                      Considering soil chemistry, weather, and seasonal factors
                    </p>
                  </div>
                </Card>
              ) : recommendations ? (
                <div className="space-y-4">
                  {/* Top 5 */}
                  <div>
                    <h3 className="font-semibold mb-3">Top Recommendations</h3>
                    <div className="grid gap-4">
                      {recommendations.topCrops.map((rec) => (
                        <CropCard key={rec.crop.id} crop={rec.crop} recommendation={rec} />
                      ))}
                    </div>
                  </div>

                  {/* Seasonal */}
                  <div>
                    <h3 className="font-semibold mb-3">Seasonal Recommendations</h3>
                    <div className="space-y-4">
                      {Object.entries(recommendations.seasonalRecommendations).map(([season, seasonCrops]) =>
                        seasonCrops.length > 0 ? (
                          <Card key={season} className="p-4 shadow-soft">
                            <h4 className="font-medium capitalize mb-3 flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              {season} Season
                            </h4>
                            <div className="grid gap-3">
                              {seasonCrops.slice(0, 3).map((rec) => (
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
                        ) : null
                      )}
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
                    <Button onClick={() => generateRecommendations()} disabled={loading}>
                      Try Again
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ── Browse tab (unchanged) ── */}
            <TabsContent value="browse" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search crops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label} ({cat.count})
                  </Button>
                ))}
              </div>

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
