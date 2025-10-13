import { useState } from 'react';
import { TabNavigation } from '@/components/TabNavigation';
import { HomeTab } from '@/components/tabs/HomeTab';
import { ClimateTab } from '@/components/tabs/ClimateTab';
import { SoilTab } from '@/components/tabs/SoilTab';
import { CropTab } from '@/components/tabs/CropTab';
import { MarketTab } from '@/components/tabs/MarketTab';
import { ProfileTab } from '@/components/tabs/ProfileTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { LocationData } from '@/services/locationService';
import DiseaseDetectionTab from '@/components/tabs/DiseaseDetectionTab';
import { CurrentWeather, WeatherForecast } from '@/services/weatherService';
import { SoilData } from '@/services/soilService';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab 
            onLocationUpdate={setLocation}
            onWeatherUpdate={setWeather}
            onSoilUpdate={setSoilData}
            onTabChange={setActiveTab}
          />
        );
      case 'climate':
        return <ClimateTab location={location} />;
      case 'soil':
        return <SoilTab location={location} initialSoilData={soilData} />;
      case 'crop':
        return (
          <CropTab 
            location={location}
            soilData={soilData}
            currentWeather={weather}
            forecast={forecast}
          />
        );
      case 'disease-detection':
        return <DiseaseDetectionTab />;
      case 'market':
        return <MarketTab location={location} currentWeather={weather} />;
      case 'profile':
        return <ProfileTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <HomeTab onLocationUpdate={setLocation} onWeatherUpdate={setWeather} onSoilUpdate={setSoilData} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="relative">
        {renderActiveTab()}
      </main>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
