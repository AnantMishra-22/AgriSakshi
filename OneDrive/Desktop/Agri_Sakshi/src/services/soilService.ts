export interface SoilData {
  type: string;
  pH: number;
  nitrogen: number; // kg/ha
  phosphorous: number; // kg/ha
  potassium: number; // kg/ha
  organicMatter: number; // %
  texture: 'sandy' | 'loamy' | 'clayey';
  drainage: 'poor' | 'moderate' | 'good' | 'excellent';
  salinity: 'low' | 'moderate' | 'high';
  detectionMethod: 'auto' | 'manual';
  confidence: number; // 0-100% for auto detection
}

export interface SoilType {
  name: string;
  characteristics: string[];
  commonRegions: string[];
  suitableCrops: string[];
  pH_range: [number, number];
  fertility: 'low' | 'medium' | 'high';
}

export class SoilService {
  // Major Indian soil types
  private static soilTypes: SoilType[] = [
    {
      name: 'Alluvial',
      characteristics: ['Fertile', 'Well-balanced nutrients', 'Good water retention'],
      commonRegions: ['Gangetic Plains', 'River Deltas', 'Punjab', 'Haryana', 'UP'],
      suitableCrops: ['rice', 'wheat', 'sugarcane', 'maize', 'cotton'],
      pH_range: [6.0, 7.5],
      fertility: 'high'
    },
    {
      name: 'Black Cotton',
      characteristics: ['High clay content', 'Swells when wet', 'Rich in minerals'],
      commonRegions: ['Maharashtra', 'Gujarat', 'MP', 'Karnataka', 'Andhra Pradesh'],
      suitableCrops: ['cotton', 'sugarcane', 'jowar', 'bajra', 'groundnut'],
      pH_range: [7.0, 8.5],
      fertility: 'high'
    },
    {
      name: 'Red Loam',
      characteristics: ['Iron oxide rich', 'Good drainage', 'Moderate fertility'],
      commonRegions: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha'],
      suitableCrops: ['ragi', 'groundnut', 'cotton', 'tobacco', 'millets'],
      pH_range: [6.0, 7.5],
      fertility: 'medium'
    },
    {
      name: 'Sandy Loam',
      characteristics: ['Good drainage', 'Easy to work', 'Low water retention'],
      commonRegions: ['Rajasthan', 'Gujarat', 'Punjab', 'Haryana'],
      suitableCrops: ['bajra', 'jowar', 'groundnut', 'sesame', 'cotton'],
      pH_range: [6.5, 7.5],
      fertility: 'medium'
    },
    {
      name: 'Lateritic',
      characteristics: ['Iron and aluminum rich', 'Acidic', 'Low fertility'],
      commonRegions: ['Kerala', 'Karnataka', 'Odisha', 'West Bengal hills'],
      suitableCrops: ['tea', 'coffee', 'cashew', 'coconut', 'ragi'],
      pH_range: [4.5, 6.5],
      fertility: 'low'
    },
    {
      name: 'Clay',
      characteristics: ['High water retention', 'Poor drainage', 'Rich nutrients'],
      commonRegions: ['West Bengal', 'Bihar', 'Assam', 'River valleys'],
      suitableCrops: ['rice', 'jute', 'sugarcane', 'wheat'],
      pH_range: [6.0, 8.0],
      fertility: 'high'
    }
  ];

  // Soil type prediction based on location (simplified mapping)
  static async detectSoilType(lat: number, lon: number, district?: string, state?: string): Promise<SoilData> {
    try {
      // If state not provided, infer from lat/lon via Open-Meteo reverse geocoding
      let inferredState = state;
      if (!inferredState) {
        const admin1 = await this.reverseGeocodeState(lat, lon);
        inferredState = this.normalizeStateName(admin1 || undefined) || undefined;
      }

      let predictedSoilType = 'Alluvial'; // default
      let confidence = 70;

      // Existing state-based mapping
      const stateToSoil: { [key: string]: { type: string; confidence: number } } = {
        'Maharashtra': { type: 'Black Cotton', confidence: 85 },
        'Gujarat': { type: 'Black Cotton', confidence: 80 },
        'Punjab': { type: 'Alluvial', confidence: 90 },
        'Haryana': { type: 'Alluvial', confidence: 88 },
        'Uttar Pradesh': { type: 'Alluvial', confidence: 85 },
        'Bihar': { type: 'Alluvial', confidence: 82 },
        'West Bengal': { type: 'Alluvial', confidence: 80 },
        'Karnataka': { type: 'Red Loam', confidence: 75 },
        'Tamil Nadu': { type: 'Red Loam', confidence: 78 },
        'Andhra Pradesh': { type: 'Red Loam', confidence: 76 },
        'Telangana': { type: 'Red Loam', confidence: 74 },
        'Kerala': { type: 'Lateritic', confidence: 85 },
        'Rajasthan': { type: 'Sandy Loam', confidence: 82 },
        'Madhya Pradesh': { type: 'Black Cotton', confidence: 70 },
        'Odisha': { type: 'Red Loam', confidence: 72 },
        'Assam': { type: 'Alluvial', confidence: 75 },
        'Delhi': { type: 'Alluvial', confidence: 80 },
        'Jammu and Kashmir': { type: 'Alluvial', confidence: 70 }
      };

      if (inferredState && stateToSoil[inferredState]) {
        predictedSoilType = stateToSoil[inferredState].type;
        confidence = stateToSoil[inferredState].confidence;
      } else if (state && stateToSoil[state]) {
        // If a raw state was provided and maps cleanly
        predictedSoilType = stateToSoil[state].type;
        confidence = stateToSoil[state].confidence;
      } else {
        // Fallback if we couldn't map a state
        confidence = 65;
      }

      // Get soil type details
      const soilTypeInfo = this.soilTypes.find(s => s.name === predictedSoilType) || this.soilTypes[0];

      // Generate stable soil parameters based on soil type and location
      const locationSeed = Math.abs(Math.sin(lat * lon * 1000)) % 1;
      const soilData: SoilData = {
        type: predictedSoilType,
        pH: this.generateStableInRange(soilTypeInfo.pH_range[0], soilTypeInfo.pH_range[1], locationSeed + 1),
        nitrogen: this.generateStableSoilNutrient(predictedSoilType, 'N', locationSeed),
        phosphorous: this.generateStableSoilNutrient(predictedSoilType, 'P', locationSeed),
        potassium: this.generateStableSoilNutrient(predictedSoilType, 'K', locationSeed),
        organicMatter: this.generateStableOrganicMatter(predictedSoilType, locationSeed),
        texture: this.getSoilTexture(predictedSoilType),
        drainage: this.getSoilDrainage(predictedSoilType),
        salinity: this.getSalinity(predictedSoilType),
        detectionMethod: 'auto',
        confidence: confidence
      };

      return soilData;
    } catch (error) {
      console.error('Soil detection failed:', error);
      // Return default soil data
      return this.getDefaultSoilData();
    }
  }

  static createManualSoilData(
    type: string,
    pH: number,
    nitrogen: number,
    phosphorous: number,
    potassium: number,
    texture: 'sandy' | 'loamy' | 'clayey'
  ): SoilData {
    return {
      type,
      pH,
      nitrogen,
      phosphorous,
      potassium,
      organicMatter: this.generateOrganicMatter(type),
      texture,
      drainage: this.getSoilDrainage(type),
      salinity: this.getSalinity(type),
      detectionMethod: 'manual',
      confidence: 100
    };
  }

  static getSoilTypes(): SoilType[] {
    return this.soilTypes;
  }

  static getSoilRecommendations(soilData: SoilData): string[] {
    const recommendations: string[] = [];

    if (soilData.pH < 6.0) {
      recommendations.push('Soil is acidic. Consider lime application to raise pH.');
    } else if (soilData.pH > 8.0) {
      recommendations.push('Soil is alkaline. Consider gypsum application to lower pH.');
    }

    if (soilData.nitrogen < 250) {
      recommendations.push('Low nitrogen levels. Apply nitrogen-rich fertilizers or organic manure.');
    }
    if (soilData.phosphorous < 25) {
      recommendations.push('Low phosphorous levels. Apply phosphatic fertilizers.');
    }
    if (soilData.potassium < 150) {
      recommendations.push('Low potassium levels. Apply potash fertilizers.');
    }

    if (soilData.organicMatter < 1.5) {
      recommendations.push('Low organic matter. Add compost, farmyard manure, or green manure.');
    }

    if (soilData.drainage === 'poor') {
      recommendations.push('Improve drainage through field channels or raised beds.');
    }

    if (soilData.salinity === 'high') {
      recommendations.push('High salinity detected. Consider salt-tolerant crops and proper drainage.');
    }

    return recommendations;
  }

  private static generateRandomInRange(min: number, max: number): number {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  private static generateStableInRange(min: number, max: number, seed: number): number {
    const seededRandom = Math.abs(Math.sin(seed * 9999)) % 1;
    return Math.round((min + seededRandom * (max - min)) * 10) / 10;
  }

  private static generateSoilNutrient(soilType: string, nutrient: 'N' | 'P' | 'K'): number {
    const ranges: { [key: string]: { N: [number, number]; P: [number, number]; K: [number, number] } } = {
      'Alluvial': { N: [300, 500], P: [30, 60], K: [200, 400] },
      'Black Cotton': { N: [250, 450], P: [25, 50], K: [300, 500] },
      'Red Loam': { N: [200, 350], P: [20, 40], K: [150, 300] },
      'Sandy Loam': { N: [150, 300], P: [15, 35], K: [100, 250] },
      'Lateritic': { N: [100, 250], P: [10, 25], K: [80, 200] },
      'Clay': { N: [280, 480], P: [28, 55], K: [250, 450] }
    };

    const range = ranges[soilType] || ranges['Alluvial'];
    return Math.round(this.generateRandomInRange(range[nutrient][0], range[nutrient][1]));
  }

  private static generateStableSoilNutrient(soilType: string, nutrient: 'N' | 'P' | 'K', locationSeed: number): number {
    const ranges: { [key: string]: { N: [number, number]; P: [number, number]; K: [number, number] } } = {
      'Alluvial': { N: [300, 500], P: [30, 60], K: [200, 400] },
      'Black Cotton': { N: [250, 450], P: [25, 50], K: [300, 500] },
      'Red Loam': { N: [200, 350], P: [20, 40], K: [150, 300] },
      'Sandy Loam': { N: [150, 300], P: [15, 35], K: [100, 250] },
      'Lateritic': { N: [100, 250], P: [10, 25], K: [80, 200] },
      'Clay': { N: [280, 480], P: [28, 55], K: [250, 450] }
    };

    const range = ranges[soilType] || ranges['Alluvial'];
    const nutrientSeed = nutrient === 'N' ? locationSeed + 2 : nutrient === 'P' ? locationSeed + 3 : locationSeed + 4;
    return Math.round(this.generateStableInRange(range[nutrient][0], range[nutrient][1], nutrientSeed));
  }

  private static generateOrganicMatter(soilType: string): number {
    const ranges: { [key: string]: [number, number] } = {
      'Alluvial': [2.5, 4.0],
      'Black Cotton': [2.0, 3.5],
      'Red Loam': [1.5, 2.8],
      'Sandy Loam': [1.0, 2.2],
      'Lateritic': [0.8, 1.8],
      'Clay': [2.2, 3.8]
    };

    const range = ranges[soilType] || ranges['Alluvial'];
    return this.generateRandomInRange(range[0], range[1]);
  }

  private static generateStableOrganicMatter(soilType: string, locationSeed: number): number {
    const ranges: { [key: string]: [number, number] } = {
      'Alluvial': [2.5, 4.0],
      'Black Cotton': [2.0, 3.5],
      'Red Loam': [1.5, 2.8],
      'Sandy Loam': [1.0, 2.2],
      'Lateritic': [0.8, 1.8],
      'Clay': [2.2, 3.8]
    };

    const range = ranges[soilType] || ranges['Alluvial'];
    return this.generateStableInRange(range[0], range[1], locationSeed + 5);
  }

  private static getSoilTexture(soilType: string): 'sandy' | 'loamy' | 'clayey' {
    const textureMap: { [key: string]: 'sandy' | 'loamy' | 'clayey' } = {
      'Alluvial': 'loamy',
      'Black Cotton': 'clayey',
      'Red Loam': 'loamy',
      'Sandy Loam': 'sandy',
      'Lateritic': 'clayey',
      'Clay': 'clayey'
    };
    return textureMap[soilType] || 'loamy';
  }

  private static getSoilDrainage(soilType: string): 'poor' | 'moderate' | 'good' | 'excellent' {
    const drainageMap: { [key: string]: 'poor' | 'moderate' | 'good' | 'excellent' } = {
      'Alluvial': 'good',
      'Black Cotton': 'poor',
      'Red Loam': 'good',
      'Sandy Loam': 'excellent',
      'Lateritic': 'moderate',
      'Clay': 'poor'
    };
    return drainageMap[soilType] || 'moderate';
  }

  private static getSalinity(soilType: string): 'low' | 'moderate' | 'high' {
    const salinityMap: { [key: string]: 'low' | 'moderate' | 'high' } = {
      'Alluvial': 'low',
      'Black Cotton': 'moderate',
      'Red Loam': 'low',
      'Sandy Loam': 'low',
      'Lateritic': 'low',
      'Clay': 'moderate'
    };
    return salinityMap[soilType] || 'low';
  }

  private static getDefaultSoilData(): SoilData {
    return {
      type: 'Alluvial',
      pH: 6.8,
      nitrogen: 350,
      phosphorous: 35,
      potassium: 280,
      organicMatter: 2.8,
      texture: 'loamy',
      drainage: 'good',
      salinity: 'low',
      detectionMethod: 'auto',
      confidence: 60
    };
  }

  // ---------- NEW HELPERS (moved inside class) ----------

  private static async reverseGeocodeState(lat: number, lon: number): Promise<string | null> {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    try {
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      const place = Array.isArray(data?.results) ? data.results[0] : null;
      if (!place) return null;

      const admin1 = (place.admin1 || '').toString().trim();
      return admin1 || null;
    } catch {
      return null;
    }
  }

  private static normalizeStateName(name: string | null | undefined): string | null {
    if (!name) return null;
    const n = name.trim().toLowerCase();

    const aliases: Record<string, string> = {
      'national capital territory of delhi': 'Delhi',
      'nct of delhi': 'Delhi',
      'delhi': 'Delhi',
      'uttar pradesh': 'Uttar Pradesh',
      'madhya pradesh': 'Madhya Pradesh',
      'andhra pradesh': 'Andhra Pradesh',
      'odisha': 'Odisha',
      'orissa': 'Odisha',
      'telangana': 'Telangana',
      'tamil nadu': 'Tamil Nadu',
      'west bengal': 'West Bengal',
      'jammu and kashmir': 'Jammu and Kashmir',
      'ladakh': 'Ladakh',
      'pondicherry': 'Puducherry',
      'puducherry': 'Puducherry'
    };

    if (aliases[n]) return aliases[n];
    return name
      .split(' ')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(' ');
  }
}
