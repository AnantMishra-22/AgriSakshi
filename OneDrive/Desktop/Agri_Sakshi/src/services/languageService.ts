export type Language = 'en' | 'hi' | 'te';

export interface Translation {
  [key: string]: string | Translation;
}

export const translations: Record<Language, Translation> = {
  en: {
    // App Title
    appTitle: 'AgriSakshi',
    appSubtitle: 'Your AI-powered farming companion',
    
    // Navigation
    home: 'Home',
    climate: 'Climate',
    soil: 'Soil',
    crop: 'Crop',
    market: 'Market',
    profile: 'Profile',
    settings: 'Settings',
    
    // Home Tab
    location: 'Location',
    refresh: 'Refresh',
    updating: 'Updating...',
    currentWeather: 'Current Weather',
    soilSummary: 'Soil Summary',
    type: 'Type',
    phLevel: 'pH Level',
    texture: 'Texture',
    drainage: 'Drainage',
    getCropRecommendations: 'Get Crop Recommendations',
    marketTrends: 'Market Trends',
    todaysTip: "Today's Tip",
    
    // Climate Tab
    weatherForecast: 'Weather Forecast',
    currentConditions: 'Current Conditions',
    sevenDayForecast: '7-Day Forecast',
    weatherAdvisories: 'Weather Advisories',
    temperature: 'Temperature',
    humidity: 'Humidity',
    rainfall: 'Rainfall',
    windSpeed: 'Wind Speed',
    pressure: 'Pressure',
    visibility: 'Visibility',
    uvIndex: 'UV Index',
    
    // Soil Tab
    soilAnalysis: 'Soil Analysis',
    autoMode: 'Auto Mode',
    manualMode: 'Manual Mode',
    soilType: 'Soil Type',
    nitrogen: 'Nitrogen',
    phosphorous: 'Phosphorous',
    potassium: 'Potassium',
    organicMatter: 'Organic Matter',
    recommendations: 'Recommendations',
    
    // Crop Tab
    cropRecommendations: 'Crop Recommendations',
    bestCropNow: 'Best Crop Now',
    suitabilityScore: 'Suitability Score',
    expectedYield: 'Expected Yield',
    sowingWindow: 'Sowing Window',
    harvestWindow: 'Harvest Window',
    
    // Market Tab
    currentPrices: 'Current Prices',
    priceAnalysis: 'Price Analysis & Forecasts',
    marketInsights: 'Market Insights',
    price: 'Price',
    change: 'Change',
    predicted: 'Predicted',
    
    // Profile Tab
    farmerProfile: 'Farmer Profile',
    personalDetails: 'Personal Details',
    farmDetails: 'Farm Details',
    name: 'Name',
    phoneNumber: 'Phone Number',
    farmSize: 'Farm Size',
    landType: 'Land Type',
    irrigationSystem: 'Irrigation System',
    
    // Settings Tab
    language: 'Language',
    units: 'Units',
    notifications: 'Notifications',
    english: 'English',
    hindi: 'हिंदी',
    telugu: 'తెలుగు',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    acres: 'acres',
    quintals: 'quintals',
    hectare: 'hectare',
    celsius: '°C',
    percentage: '%',
    kmh: 'km/h',
    mm: 'mm',
    hpa: 'hPa',
    km: 'km'
  },
  
  hi: {
    // App Title
    appTitle: 'एग्रीसाक्षी',
    appSubtitle: 'आपका AI-संचालित कृषि साथी',
    
    // Navigation
    home: 'मुख्य',
    climate: 'जलवायु',
    soil: 'मिट्टी',
    crop: 'फसल',
    market: 'बाज़ार',
    profile: 'प्रोफ़ाइल',
    settings: 'सेटिंग्स',
    
    // Home Tab
    location: 'स्थान',
    refresh: 'रिफ्रेश',
    updating: 'अपडेट हो रहा है...',
    currentWeather: 'वर्तमान मौसम',
    soilSummary: 'मिट्टी सारांश',
    type: 'प्रकार',
    phLevel: 'पीएच स्तर',
    texture: 'बनावट',
    drainage: 'जल निकासी',
    getCropRecommendations: 'फसल सुझाव प्राप्त करें',
    marketTrends: 'बाज़ार रुझान',
    todaysTip: 'आज की सलाह',
    
    // Climate Tab
    weatherForecast: 'मौसम पूर्वानुमान',
    currentConditions: 'वर्तमान स्थितियां',
    sevenDayForecast: '7-दिन पूर्वानुमान',
    weatherAdvisories: 'मौसम सलाह',
    temperature: 'तापमान',
    humidity: 'नमी',
    rainfall: 'वर्षा',
    windSpeed: 'हवा की गति',
    pressure: 'दबाव',
    visibility: 'दृश्यता',
    uvIndex: 'यूवी इंडेक्स',
    
    // Soil Tab
    soilAnalysis: 'मिट्टी विश्लेषण',
    autoMode: 'ऑटो मोड',
    manualMode: 'मैन्युअल मोड',
    soilType: 'मिट्टी का प्रकार',
    nitrogen: 'नाइट्रोजन',
    phosphorous: 'फास्फोरस',
    potassium: 'पोटैशियम',
    organicMatter: 'कार्बनिक पदार्थ',
    recommendations: 'सुझाव',
    
    // Crop Tab
    cropRecommendations: 'फसल सुझाव',
    bestCropNow: 'अभी सबसे अच्छी फसल',
    suitabilityScore: 'उपयुक्तता स्कोर',
    expectedYield: 'अपेक्षित उत्पादन',
    sowingWindow: 'बुवाई का समय',
    harvestWindow: 'कटाई का समय',
    
    // Market Tab
    currentPrices: 'वर्तमान कीमतें',
    priceAnalysis: 'कीमत विश्लेषण और पूर्वानुमान',
    marketInsights: 'बाज़ार अंतर्दृष्टि',
    price: 'कीमत',
    change: 'परिवर्तन',
    predicted: 'पूर्वानुमानित',
    
    // Profile Tab
    farmerProfile: 'किसान प्रोफ़ाइल',
    personalDetails: 'व्यक्तिगत विवरण',
    farmDetails: 'खेत विवरण',
    name: 'नाम',
    phoneNumber: 'फोन नंबर',
    farmSize: 'खेत का आकार',
    landType: 'भूमि प्रकार',
    irrigationSystem: 'सिंचाई प्रणाली',
    
    // Settings Tab
    language: 'भाषा',
    units: 'इकाइयां',
    notifications: 'सूचनाएं',
    english: 'English',
    hindi: 'हिंदी',
    telugu: 'తెలుగు',
    
    // Common
    save: 'सहेजें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    acres: 'एकड़',
    quintals: 'क्विंटल',
    hectare: 'हेक्टेयर',
    celsius: '°C',
    percentage: '%',
    kmh: 'किमी/घं',
    mm: 'मिमी',
    hpa: 'hPa',
    km: 'किमी'
  },
  
  te: {
    // App Title
    appTitle: 'అగ్రీసాక్షి',
    appSubtitle: 'మీ AI-శక్తితో కూడిన వ్యవసాయ సహాయకుడు',
    
    // Navigation
    home: 'హోమ్',
    climate: 'వాతావరణం',
    soil: 'మట్టి',
    crop: 'పంట',
    market: 'మార్కెట్',
    profile: 'ప్రొఫైల్',
    settings: 'సెట్టింగ్స్',
    
    // Home Tab
    location: 'స్థానం',
    refresh: 'రిఫ్రెష్',
    updating: 'అప్‌డేట్ అవుతోంది...',
    currentWeather: 'ప్రస్తుత వాతావరణం',
    soilSummary: 'మట్టి సారాంశం',
    type: 'రకం',
    phLevel: 'pH స్థాయి',
    texture: 'ఆకృతి',
    drainage: 'డ్రైనేజీ',
    getCropRecommendations: 'పంట సిఫార్సులు పొందండి',
    marketTrends: 'మార్కెట్ ట్రెండ్స్',
    todaysTip: 'నేటి చిట్కా',
    
    // Climate Tab
    weatherForecast: 'వాతావరణ అంచనా',
    currentConditions: 'ప్రస్తుత పరిస్థితులు',
    sevenDayForecast: '7-రోజుల అంచనా',
    weatherAdvisories: 'వాతావరణ సలహాలు',
    temperature: 'ఉష్ణోగ్రత',
    humidity: 'తేమ',
    rainfall: 'వర్షపాతం',
    windSpeed: 'గాలి వేగం',
    pressure: 'ఒత్తిడి',
    visibility: 'దృశ్యత',
    uvIndex: 'UV ఇండెక్స్',
    
    // Soil Tab
    soilAnalysis: 'మట్టి విశ్లేషణ',
    autoMode: 'ఆటో మోడ్',
    manualMode: 'మాన్యువల్ మోడ్',
    soilType: 'మట్టి రకం',
    nitrogen: 'నైట్రోజన్',
    phosphorous: 'ఫాస్పరస్',
    potassium: 'పొటాషియం',
    organicMatter: 'కర్బన పదార్థం',
    recommendations: 'సిఫార్సులు',
    
    // Crop Tab
    cropRecommendations: 'పంట సిఫార్సులు',
    bestCropNow: 'ఇప్పుడు ఉత్తమ పంట',
    suitabilityScore: 'అనుకూలత స్కోర్',
    expectedYield: 'ఆశించిన దిగుబడి',
    sowingWindow: 'విత్తన కాలం',
    harvestWindow: 'పంట కాలం',
    
    // Market Tab
    currentPrices: 'ప్రస్తుత ధరలు',
    priceAnalysis: 'ధర విశ్లేషణ & అంచనాలు',
    marketInsights: 'మార్కెట్ అంతర్దృష్టులు',
    price: 'ధర',
    change: 'మార్పు',
    predicted: 'అంచనా వేయబడిన',
    
    // Profile Tab
    farmerProfile: 'రైతు ప్రొఫైల్',
    personalDetails: 'వ్యక్తిగత వివరాలు',
    farmDetails: 'వ్యవసాయ వివరాలు',
    name: 'పేరు',
    phoneNumber: 'ఫోన్ నంబర్',
    farmSize: 'పొలం పరిమాణం',
    landType: 'భూమి రకం',
    irrigationSystem: 'నీటిపారుదల వ్యవస్థ',
    
    // Settings Tab
    language: 'భాష',
    units: 'యూనిట్లు',
    notifications: 'నోటిఫికేషన్లు',
    english: 'English',
    hindi: 'हिंदी',
    telugu: 'తెలుగు',
    
    // Common
    save: 'సేవ్',
    cancel: 'రద్దు',
    loading: 'లోడ్ అవుతోంది...',
    error: 'లోపం',
    success: 'విజయం',
    acres: 'ఎకరాలు',
    quintals: 'క్వింటల్స్',
    hectare: 'హెక్టార్',
    celsius: '°C',
    percentage: '%',
    kmh: 'కి.మీ/గం',
    mm: 'మి.మీ',
    hpa: 'hPa',
    km: 'కి.మీ'
  }
};

import { useState, useEffect } from 'react';

export class LanguageService {
  private static currentLanguage: Language = 'en';
  
  static setLanguage(language: Language): void {
    this.currentLanguage = language;
    // In a real app with backend, you'd save this to user preferences
    localStorage.setItem('agri_language', language);
  }
  
  static getCurrentLanguage(): Language {
    const saved = localStorage.getItem('agri_language') as Language;
    return saved || this.currentLanguage;
  }
  
  static getTranslation(key: string): string {
    const keys = key.split('.');
    let current: any = translations[this.currentLanguage];
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English if translation not found
        current = translations['en'];
        for (const fallbackKey of keys) {
          if (current && typeof current === 'object' && fallbackKey in current) {
            current = current[fallbackKey];
          } else {
            return key; // Return key if no translation found
          }
        }
        break;
      }
    }
    
    return typeof current === 'string' ? current : key;
  }
  
  static t(key: string): string {
    return this.getTranslation(key);
  }
}

export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  const changeLanguage = (language: Language) => {
    setCurrentLanguage(language);
    LanguageService.setLanguage(language);
  };

  const t = (key: string): string => {
    return LanguageService.getTranslation(key);
  };

  // Load saved language on mount
  useEffect(() => {
    const saved = LanguageService.getCurrentLanguage();
    setCurrentLanguage(saved);
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    t
  };
};