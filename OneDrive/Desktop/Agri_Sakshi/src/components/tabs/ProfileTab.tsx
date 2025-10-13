import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, MapPin, Tractor, Droplets, Sprout } from "lucide-react";
import { LanguageService } from '@/services/languageService';
import { useToast } from "@/hooks/use-toast";

interface FarmerProfile {
  personalDetails: {
    name: string;
    phoneNumber: string;
    email: string;
    address: string;
    experience: string;
  };
  farmDetails: {
    farmSize: string;
    farmUnit: 'acres' | 'hectares';
    landType: 'owned' | 'leased' | 'sharecropped';
    soilType: string;
    irrigationSystem: string;
    currentCrops: string[];
    farmingType: 'organic' | 'conventional' | 'mixed';
  };
  preferences: {
    language: 'en' | 'hi' | 'te';
    units: 'metric' | 'imperial';
    notifications: boolean;
  };
}

export const ProfileTab = () => {
  const [profile, setProfile] = useState<FarmerProfile>({
    personalDetails: {
      name: '',
      phoneNumber: '',
      email: '',
      address: '',
      experience: ''
    },
    farmDetails: {
      farmSize: '',
      farmUnit: 'acres',
      landType: 'owned',
      soilType: '',
      irrigationSystem: '',
      currentCrops: [],
      farmingType: 'conventional'
    },
    preferences: {
      language: 'en',
      units: 'metric',
      notifications: true
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const t = (key: string) => LanguageService.getTranslation(key);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    // In a real app, this would load from Supabase
    const savedProfile = localStorage.getItem('farmer_profile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  };

  const saveProfile = () => {
    // In a real app, this would save to Supabase
    localStorage.setItem('farmer_profile', JSON.stringify(profile));
    setIsEditing(false);
    toast({
      title: t('success'),
      description: 'Profile updated successfully',
    });
  };

  const handlePersonalDetailsChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        [field]: value
      }
    }));
  };

  const handleFarmDetailsChange = (field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      farmDetails: {
        ...prev.farmDetails,
        [field]: value
      }
    }));
  };

  const irrigationSystems = [
    'Drip irrigation',
    'Sprinkler irrigation', 
    'Flood irrigation',
    'Furrow irrigation',
    'Rain-fed',
    'Tube well',
    'Canal irrigation',
    'Tank irrigation'
  ];

  const soilTypes = [
    'Alluvial',
    'Black Cotton',
    'Red Loam',
    'Sandy Loam',
    'Lateritic',
    'Clay',
    'Mixed'
  ];

  const cropOptions = [
    'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 
    'Groundnut', 'Soybean', 'Sunflower', 'Jowar', 'Bajra'
  ];

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {t('farmerProfile')}
        </h1>
        <p className="text-muted-foreground">Manage your farming profile and preferences</p>
      </div>

      {/* Personal Details */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center">
            <User className="w-5 h-5 mr-2 text-primary" />
            {t('personalDetails')}
          </h3>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="name">{t('name')}</Label>
            <Input
              id="name"
              value={profile.personalDetails.name}
              onChange={(e) => handlePersonalDetailsChange('name', e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <Label htmlFor="phone">{t('phoneNumber')}</Label>
            <Input
              id="phone"
              value={profile.personalDetails.phoneNumber}
              onChange={(e) => handlePersonalDetailsChange('phoneNumber', e.target.value)}
              disabled={!isEditing}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.personalDetails.email}
              onChange={(e) => handlePersonalDetailsChange('email', e.target.value)}
              disabled={!isEditing}
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={profile.personalDetails.address}
              onChange={(e) => handlePersonalDetailsChange('address', e.target.value)}
              disabled={!isEditing}
              placeholder="Your complete address"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="experience">Farming Experience</Label>
            <Select
              value={profile.personalDetails.experience}
              onValueChange={(value) => handlePersonalDetailsChange('experience', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<1">Less than 1 year</SelectItem>
                <SelectItem value="1-5">1-5 years</SelectItem>
                <SelectItem value="5-10">5-10 years</SelectItem>
                <SelectItem value="10-20">10-20 years</SelectItem>
                <SelectItem value=">20">More than 20 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Farm Details */}
      <Card className="p-4">
        <h3 className="font-semibold flex items-center mb-4">
          <Tractor className="w-5 h-5 mr-2 text-success" />
          {t('farmDetails')}
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="farmSize">{t('farmSize')}</Label>
              <Input
                id="farmSize"
                value={profile.farmDetails.farmSize}
                onChange={(e) => handleFarmDetailsChange('farmSize', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter farm size"
              />
            </div>
            <div>
              <Label htmlFor="farmUnit">Unit</Label>
              <Select
                value={profile.farmDetails.farmUnit}
                onValueChange={(value) => handleFarmDetailsChange('farmUnit', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acres">{t('acres')}</SelectItem>
                  <SelectItem value="hectares">{t('hectare')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="landType">{t('landType')}</Label>
            <Select
              value={profile.farmDetails.landType}
              onValueChange={(value) => handleFarmDetailsChange('landType', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="leased">Leased</SelectItem>
                <SelectItem value="sharecropped">Share-cropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="soilType">Soil Type</Label>
            <Select
              value={profile.farmDetails.soilType}
              onValueChange={(value) => handleFarmDetailsChange('soilType', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select soil type" />
              </SelectTrigger>
              <SelectContent>
                {soilTypes.map(soil => (
                  <SelectItem key={soil} value={soil.toLowerCase()}>{soil}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="irrigation">{t('irrigationSystem')}</Label>
            <Select
              value={profile.farmDetails.irrigationSystem}
              onValueChange={(value) => handleFarmDetailsChange('irrigationSystem', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select irrigation system" />
              </SelectTrigger>
              <SelectContent>
                {irrigationSystems.map(system => (
                  <SelectItem key={system} value={system.toLowerCase()}>{system}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="farmingType">Farming Type</Label>
            <Select
              value={profile.farmDetails.farmingType}
              onValueChange={(value) => handleFarmDetailsChange('farmingType', value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organic">Organic</SelectItem>
                <SelectItem value="conventional">Conventional</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-2">
          <Button onClick={saveProfile} className="flex-1">
            <Sprout className="w-4 h-4 mr-2" />
            {t('save')} Profile
          </Button>
          <Button 
            onClick={() => {
              setIsEditing(false);
              loadProfile();
            }} 
            variant="outline"
          >
            {t('cancel')}
          </Button>
        </div>
      )}

      {/* Storage Note */}
      <Card className="p-4 bg-warning/5 border-warning/20">
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-warning mt-0.5" />
          <div>
            <h4 className="font-medium text-warning">Connect to Supabase for Data Persistence</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Currently, your profile data is stored locally. To sync across devices and ensure data backup, 
              connect to Supabase using the integration button in the top-right corner.
            </p>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
};