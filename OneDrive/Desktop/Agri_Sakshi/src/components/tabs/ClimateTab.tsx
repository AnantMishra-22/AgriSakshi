import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Sun, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  RefreshCw
} from "lucide-react";
import { WeatherService, CurrentWeather, WeatherForecast, WeatherAdvisory } from '@/services/weatherService';
import { LocationData } from '@/services/locationService';

interface ClimateTabProps {
  location: LocationData | null;
}

export const ClimateTab = ({ location }: ClimateTabProps) => {
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [advisories, setAdvisories] = useState<WeatherAdvisory[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadWeatherData = async () => {
    if (!location) return;
    
    setLoading(true);
    try {
      const [weather, forecastData, advisoryData, trendData] = await Promise.all([
        WeatherService.getCurrentWeather(location.latitude, location.longitude),
        WeatherService.getWeatherForecast(location.latitude, location.longitude, 7),
        WeatherService.getWeatherAdvisories(location.district || ''),
        WeatherService.getSeasonalTrends(location.latitude, location.longitude)
      ]);

      setCurrentWeather(weather);
      setForecast(forecastData);
      setAdvisories(advisoryData);
      setTrends(trendData);
    } catch (error) {
      console.error('Weather data loading failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherData();
  }, [location]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Climate Data</h2>
          <p className="text-muted-foreground">
            {location ? `${location.district}, ${location.state}` : 'Location not available'}
          </p>
        </div>
        <Button onClick={loadWeatherData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Current Weather Card */}
      <Card className="p-6 bg-gradient-sky shadow-strong">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-white">Current Conditions</h3>
          <p className="text-white/80 text-sm">
            {currentWeather?.observationTime ? 
              new Date(currentWeather.observationTime).toLocaleString('en-IN') : 
              'Loading...'
            }
          </p>
        </div>

        {currentWeather ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="p-3 bg-white/20 rounded-lg mb-2">
                <Thermometer className="w-6 h-6 text-white mx-auto" />
              </div>
              <p className="text-white text-sm">Temperature</p>
              <p className="text-white font-bold text-lg">{currentWeather.temperature}°C</p>
            </div>

            <div className="text-center">
              <div className="p-3 bg-white/20 rounded-lg mb-2">
                <Droplets className="w-6 h-6 text-white mx-auto" />
              </div>
              <p className="text-white text-sm">Humidity</p>
              <p className="text-white font-bold text-lg">{currentWeather.humidity}%</p>
            </div>

            <div className="text-center">
              <div className="p-3 bg-white/20 rounded-lg mb-2">
                <Wind className="w-6 h-6 text-white mx-auto" />
              </div>
              <p className="text-white text-sm">Wind Speed</p>
              <p className="text-white font-bold text-lg">{currentWeather.windSpeed} km/h</p>
            </div>

            <div className="text-center">
              <div className="p-3 bg-white/20 rounded-lg mb-2">
                <Sun className="w-6 h-6 text-white mx-auto" />
              </div>
              <p className="text-white text-sm">UV Index</p>
              <p className="text-white font-bold text-lg">{currentWeather.uvIndex}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-white">
            <p>Loading current weather...</p>
          </div>
        )}
      </Card>

      {/* 7-Day Forecast */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary" />
          7-Day Forecast
        </h3>
        
        <div className="space-y-3">
          {forecast.map((day, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{day.icon}</span>
                <div>
                  <p className="font-medium">{formatDate(day.date)}</p>
                  <p className="text-sm text-muted-foreground">{day.condition}</p>
                </div>
              </div>
              
              <div className="text-right space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{day.maxTemp}°</span>
                  <span className="text-sm text-muted-foreground">{day.minTemp}°</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <span>💧 {day.rainfall}mm</span>
                  <span>💨 {day.windSpeed}km/h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weather Advisories */}
      {advisories.length > 0 && (
        <Card className="p-4 shadow-soft">
          <h3 className="font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
            Weather Advisories
          </h3>
          
          <div className="space-y-3">
            {advisories.map((advisory) => (
              <Card key={advisory.id} className="p-3 border-l-4 border-l-warning">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{advisory.title}</h4>
                  <Badge variant={getSeverityColor(advisory.severity) as any}>
                    {advisory.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{advisory.message}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{advisory.category}</span>
                  <span>Valid until: {formatDate(advisory.validTo)}</span>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Seasonal Trends */}
      {trends && (
        <Card className="p-4 shadow-soft">
          <h3 className="font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-accent" />
            Seasonal Trends
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-warning/10 rounded-lg">
              <h4 className="font-medium text-warning">Summer</h4>
              <p className="text-sm text-muted-foreground">Avg Temp: {trends.seasonal.summer.avgTemp}°C</p>
              <p className="text-sm text-muted-foreground">Rainfall: {trends.seasonal.summer.totalRainfall}mm</p>
            </div>
            
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <h4 className="font-medium text-primary">Monsoon</h4>
              <p className="text-sm text-muted-foreground">Avg Temp: {trends.seasonal.monsoon.avgTemp}°C</p>
              <p className="text-sm text-muted-foreground">Rainfall: {trends.seasonal.monsoon.totalRainfall}mm</p>
            </div>
            
            <div className="text-center p-3 bg-info/10 rounded-lg">
              <h4 className="font-medium text-info">Winter</h4>
              <p className="text-sm text-muted-foreground">Avg Temp: {trends.seasonal.winter.avgTemp}°C</p>
              <p className="text-sm text-muted-foreground">Rainfall: {trends.seasonal.winter.totalRainfall}mm</p>
            </div>
          </div>
        </Card>
      )}

      {/* Agricultural Weather Tips */}
      <Card className="p-4 bg-accent/5 border-accent/20">
        <h4 className="font-medium text-accent mb-2">Agricultural Weather Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Monitor UV index for field work timing</li>
          <li>• Check wind speed before spraying operations</li>
          <li>• Plan irrigation based on rainfall forecasts</li>
          <li>• Protect crops during extreme weather events</li>
        </ul>
      </Card>
    </div>
    </div>
  );
};