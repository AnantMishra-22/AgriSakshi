import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Thermometer, Droplets, Wind, Leaf, AlertCircle, TrendingUp, Cloud, Mountain } from "lucide-react";
import { LocationService, LocationData } from '@/services/locationService';
import { WeatherService, CurrentWeather } from '@/services/weatherService';
import { SoilService, SoilData } from '@/services/soilService';
import { useToast } from "@/hooks/use-toast";

interface HomeTabProps {
  onLocationUpdate: (location: LocationData) => void;
  onWeatherUpdate: (weather: CurrentWeather) => void;
  onSoilUpdate: (soil: SoilData) => void;
  onTabChange?: (tab: string) => void;
}

export const HomeTab = ({ onLocationUpdate, onWeatherUpdate, onSoilUpdate, onTabChange }: HomeTabProps) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [soil, setSoil] = useState<SoilData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const initializeData = async () => {
    setLoading(true);
    try {
      // Get location
      const locationData = await LocationService.getCurrentLocation();
      setLocation(locationData);
      onLocationUpdate(locationData);

      // Get weather
      const weatherData = await WeatherService.getCurrentWeather(
        locationData.latitude, 
        locationData.longitude
      );
      setWeather(weatherData);
      onWeatherUpdate(weatherData);

      // Get soil data
      const soilData = await SoilService.detectSoilType(
        locationData.latitude,
        locationData.longitude,
        locationData.district,
        locationData.state
      );
      setSoil(soilData);
      onSoilUpdate(soilData);

      toast({
        title: "Data Updated",
        description: "Location, weather, and soil data refreshed successfully.",
      });
    } catch (error) {
      console.error('Initialization error:', error);
      toast({
        title: "Error",
        description: "Failed to load some data. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeData();
  }, []);

  const getWeatherIcon = (condition: string) => {
    const iconMap: { [key: string]: string } = {
      'Clear': '☀️',
      'Sunny': '☀️',
      'Partly Cloudy': '⛅',
      'Cloudy': '☁️',
      'Light Rain': '🌧️',
      'Rain': '🌧️',
      'Thunderstorms': '⛈️'
    };
    return iconMap[condition] || '🌤️';
  };

  const getSoilHealthColor = (soilData: SoilData | null) => {
    if (!soilData) return 'secondary';
    
    let healthScore = 0;
    if (soilData.pH >= 6.0 && soilData.pH <= 7.5) healthScore += 25;
    if (soilData.nitrogen > 250) healthScore += 25;
    if (soilData.phosphorous > 25) healthScore += 25;
    if (soilData.organicMatter > 2.0) healthScore += 25;
    
    if (healthScore >= 75) return 'success';
    if (healthScore >= 50) return 'warning';
    return 'destructive';
  };

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          AgriSakshi
        </h1>
        <p className="text-muted-foreground">Your AI-powered farming companion</p>
      </div>

      {/* Location Card */}
      <Card className="p-4 bg-gradient-earth border-0 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Location</h3>
              <p className="text-sm text-muted-foreground">
                {location ? (
                  `${location.district || 'Unknown'}, ${location.state || 'India'}`
                ) : (
                  'Detecting location...'
                )}
              </p>
            </div>
          </div>
          <Button 
            onClick={initializeData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </Card>

      {/* Weather Summary */}
      <Card className="p-4 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center">
            <Cloud className="w-5 h-5 mr-2 text-info" />
            Current Weather
          </h3>
          {weather && (
            <span className="text-2xl">
              {getWeatherIcon(weather.condition)}
            </span>
          )}
        </div>
        
        {weather ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-destructive" />
              <span className="text-sm">{weather.temperature}°C</span>
            </div>
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-info" />
              <span className="text-sm">{weather.humidity}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-accent" />
              <span className="text-sm">{weather.windSpeed} km/h</span>
            </div>
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-primary" />
              <span className="text-sm">{weather.rainfall}mm</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Loading weather data...</p>
        )}
      </Card>

      {/* Soil Summary */}
      <Card className="p-4 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center">
            <Mountain className="w-5 h-5 mr-2 text-warning" />
            Soil Summary
          </h3>
          <Badge variant={getSoilHealthColor(soil) as any}>
            {soil?.confidence ? `${soil.confidence}% confident` : 'Analyzing...'}
          </Badge>
        </div>
        
        {soil ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Type:</span>
              <Badge variant="outline">{soil.type}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">pH Level:</span>
              <span className="text-sm">{soil.pH}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Texture:</span>
              <span className="text-sm capitalize">{soil.texture}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Drainage:</span>
              <span className="text-sm capitalize">{soil.drainage}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Analyzing soil data...</p>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 shadow-soft hover:shadow-strong transition-shadow cursor-pointer"
          onClick={() => onTabChange?.('crop')}>
          <div className="text-center space-y-2">
            <div className="p-3 bg-success/10 rounded-full w-fit mx-auto">
              <Leaf className="w-6 h-6 text-success" />
            </div>
            <h4 className="font-medium">Get Crop Recommendations</h4>
            <p className="text-xs text-muted-foreground">Based on your conditions</p>
          </div>
        </Card>
        
        <Card className="p-4 shadow-soft hover:shadow-strong transition-shadow cursor-pointer"
          onClick={() => onTabChange?.('market')}>
          <div className="text-center space-y-2">
            <div className="p-3 bg-info/10 rounded-full w-fit mx-auto">
              <TrendingUp className="w-6 h-6 text-info" />
            </div>
            <h4 className="font-medium">Market Trends</h4>
            <p className="text-xs text-muted-foreground">Price analysis & forecasts</p>
          </div>
        </Card>
      </div>

      {/* Agricultural Tips */}
      <Card className="p-4 bg-accent/5 border-accent/20">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <h4 className="font-medium text-accent">Today's Tip</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {weather && weather.temperature > 30 
                ? "High temperatures detected. Ensure adequate irrigation and consider early morning/evening field activities."
                : "Check soil moisture levels before irrigation. Over-watering can be as harmful as under-watering."
              }
            </p>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
};