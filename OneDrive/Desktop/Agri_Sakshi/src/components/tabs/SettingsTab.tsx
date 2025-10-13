import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Globe, 
  Bell, 
  MapPin, 
  Thermometer, 
  User,
  Smartphone,
  Database,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/services/languageService";

export const SettingsTab = () => {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [language, setLanguage] = useState(currentLanguage);
  const [temperatureUnit, setTemperatureUnit] = useState('celsius');
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [pincode, setPincode] = useState('');
  const { toast } = useToast();

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('agrisakshi_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setLanguage(settings.language || currentLanguage);
      setTemperatureUnit(settings.temperatureUnit || 'celsius');
      setNotifications(settings.notifications !== undefined ? settings.notifications : true);
      setLocationSharing(settings.locationSharing !== undefined ? settings.locationSharing : true);
      setPincode(settings.pincode || '');
    }
  }, [currentLanguage]);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
  ];

  const saveSettings = () => {
    // Change language in the language service
    changeLanguage(language as any);
    
    // Save settings to localStorage
    const settings = {
      language,
      temperatureUnit,
      notifications,
      locationSharing,
      pincode,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('agrisakshi_settings', JSON.stringify(settings));
    
    toast({
      title: t('success'),
      description: "Your preferences have been updated successfully.",
    });
  };

  const clearData = () => {
    localStorage.clear();
    toast({
      title: "Data Cleared",
      description: "All app data has been cleared from this device.",
    });
  };

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center">
          <Settings className="w-6 h-6 mr-2 text-primary" />
          {t('settings')}
        </h2>
        <p className="text-muted-foreground">Customize your AgriSakshi experience</p>
      </div>

      {/* Language & Localization */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-info" />
          Language & Region
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="language">{t('language')}</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center space-x-2">
                      <span>{lang.name}</span>
                      <span className="text-muted-foreground">({lang.native})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="temperature">Temperature Unit</Label>
            <Select value={temperatureUnit} onValueChange={setTemperatureUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Location Settings */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-warning" />
          Location Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="location-sharing">Auto-detect Location</Label>
              <p className="text-sm text-muted-foreground">
                Allow app to use GPS for weather and soil data
              </p>
            </div>
            <Switch
              id="location-sharing"
              checked={locationSharing}
              onCheckedChange={setLocationSharing}
            />
          </div>

          <div>
            <Label htmlFor="pincode">Backup PIN Code</Label>
            <Input
              id="pincode"
              type="text"
              placeholder="Enter your area PIN code"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used when GPS is unavailable
            </p>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-accent" />
          Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Weather Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about weather warnings and advisories
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="crop-reminders">Crop Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Sowing and harvest time reminders
              </p>
            </div>
            <Switch
              id="crop-reminders"
              checked={true}
              onCheckedChange={() => {}}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="market-updates">Market Updates</Label>
              <p className="text-sm text-muted-foreground">
                Price trends and market information
              </p>
            </div>
            <Switch
              id="market-updates"
              checked={false}
              onCheckedChange={() => {}}
            />
          </div>
        </div>
      </Card>

      {/* Data & Privacy */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-destructive" />
          Data & Privacy
        </h3>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm">
              Your data is stored locally on your device. We don't collect personal information 
              without your consent.
            </p>
          </div>

          <Button variant="outline" onClick={clearData} className="w-full">
            Clear All Data
          </Button>
        </div>
      </Card>

      {/* App Information */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <Smartphone className="w-5 h-5 mr-2 text-info" />
          App Information
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version:</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Build:</span>
            <span>2024.12.19</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated:</span>
            <span>Today</span>
          </div>
        </div>
      </Card>

      {/* Help & Support */}
      <Card className="p-4 shadow-soft">
        <h3 className="font-semibold mb-4 flex items-center">
          <HelpCircle className="w-5 h-5 mr-2 text-accent" />
          Help & Support
        </h3>
        
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            User Guide & Tutorials
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Frequently Asked Questions
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Contact Support
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Send Feedback
          </Button>
        </div>
      </Card>

      {/* Save Settings */}
      <div className="flex gap-3">
        <Button onClick={saveSettings} className="flex-1">
          {t('save')} {t('settings')}
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          AgriSakshi - Your AI-powered farming companion
        </p>
        <p className="text-xs text-muted-foreground">
          Made with ❤️ for farmers
        </p>
      </div>
    </div>
  );
};