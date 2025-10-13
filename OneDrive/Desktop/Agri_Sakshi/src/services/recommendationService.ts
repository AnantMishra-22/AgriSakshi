import { Crop, crops } from '../data/crops';
import { SoilData } from './soilService';
import { CurrentWeather, WeatherForecast } from './weatherService';

export interface CropRecommendation {
  crop: Crop;
  score: number;
  rationale: string[];
  expectedYield: string;
  profitHint: string;
  sowingWindow: string;
  harvestWindow: string;
  risks: string[];
  advantages: string[];
  irrigationNeeds: string;
}

export interface RecommendationResult {
  bestCrop: CropRecommendation | null;
  topCrops: CropRecommendation[];
  seasonalRecommendations: {
    [season: string]: CropRecommendation[];
  };
}

export class RecommendationService {
  static generateRecommendations(
    soilData: SoilData,
    currentWeather: CurrentWeather,
    forecast: WeatherForecast[],
    location: { latitude: number; longitude: number; state?: string }
  ): RecommendationResult {
    const recommendations: CropRecommendation[] = [];
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentSeason = this.getCurrentSeason(currentMonth);

    for (const crop of crops) {
      const score = this.calculateCropScore(crop, soilData, currentWeather, forecast, currentSeason);
      const recommendation = this.createRecommendation(crop, score, soilData, currentWeather, forecast, currentSeason);
      recommendations.push(recommendation);
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Get top 5 recommendations
    const topCrops = recommendations.slice(0, 5);
    const bestCrop = recommendations.length > 0 ? recommendations[0] : null;

    // Group by seasons
    const seasonalRecommendations = this.groupBySeason(recommendations);

    return {
      bestCrop,
      topCrops,
      seasonalRecommendations
    };
  }

  private static calculateCropScore(
    crop: Crop,
    soil: SoilData,
    weather: CurrentWeather,
    forecast: WeatherForecast[],
    season: string
  ): number {
    let score = 0;
    const maxScore = 100;

    // 1. Soil Suitability (30% weight)
    const soilScore = this.calculateSoilSuitability(crop, soil) * 0.3;
    score += soilScore;

    // 2. Weather Fit (25% weight)
    const weatherScore = this.calculateWeatherFit(crop, weather, forecast) * 0.25;
    score += weatherScore;

    // 3. Seasonality (20% weight)
    const seasonScore = this.calculateSeasonality(crop, season) * 0.2;
    score += seasonScore;

    // 4. Profit Potential (15% weight)
    const profitScore = this.calculateProfitPotential(crop) * 0.15;
    score += profitScore;

    // 5. Risk Assessment (10% weight)
    const riskScore = this.calculateRiskScore(crop, weather, forecast) * 0.1;
    score += riskScore;

    return Math.min(Math.round(score), maxScore);
  }

  private static calculateSoilSuitability(crop: Crop, soil: SoilData): number {
    let score = 0;

    // Soil type compatibility (40% of soil score)
    if (crop.soil_ok.some(soilType => 
      soil.type.toLowerCase().includes(soilType.toLowerCase()) ||
      soilType.toLowerCase().includes(soil.type.toLowerCase())
    )) {
      score += 40;
    } else {
      // Partial compatibility
      score += 15;
    }

    // pH compatibility (35% of soil score)
    if (soil.pH >= crop.pH[0] && soil.pH <= crop.pH[1]) {
      score += 35;
    } else {
      const pHDeviation = Math.min(
        Math.abs(soil.pH - crop.pH[0]),
        Math.abs(soil.pH - crop.pH[1])
      );
      score += Math.max(0, 35 - pHDeviation * 10);
    }

    // Nutrient levels (25% of soil score)
    const nScore = Math.min(soil.nitrogen / 400, 1) * 10;
    const pScore = Math.min(soil.phosphorous / 50, 1) * 8;
    const kScore = Math.min(soil.potassium / 300, 1) * 7;
    score += nScore + pScore + kScore;

    return Math.min(score, 100);
  }

  private static calculateWeatherFit(crop: Crop, weather: CurrentWeather, forecast: WeatherForecast[]): number {
    let score = 0;

    // Current temperature fit (40% of weather score)
    if (weather.temperature >= crop.ideal_temp[0] && weather.temperature <= crop.ideal_temp[1]) {
      score += 40;
    } else {
      const tempDeviation = Math.min(
        Math.abs(weather.temperature - crop.ideal_temp[0]),
        Math.abs(weather.temperature - crop.ideal_temp[1])
      );
      score += Math.max(0, 40 - tempDeviation * 3);
    }

    // Forecast temperature trend (30% of weather score)
    const avgForecastTemp = forecast.reduce((sum, day) => sum + (day.maxTemp + day.minTemp) / 2, 0) / forecast.length;
    if (avgForecastTemp >= crop.ideal_temp[0] && avgForecastTemp <= crop.ideal_temp[1]) {
      score += 30;
    } else {
      const tempDeviation = Math.min(
        Math.abs(avgForecastTemp - crop.ideal_temp[0]),
        Math.abs(avgForecastTemp - crop.ideal_temp[1])
      );
      score += Math.max(0, 30 - tempDeviation * 2);
    }

    // Rainfall projection (30% of weather score)
    const totalForecastRainfall = forecast.reduce((sum, day) => sum + day.rainfall, 0);
    const monthlyRainfall = (totalForecastRainfall / 7) * 30; // Approximate monthly
    
    if (monthlyRainfall >= crop.rainfall_need[0] && monthlyRainfall <= crop.rainfall_need[1]) {
      score += 30;
    } else if (monthlyRainfall < crop.rainfall_need[0]) {
      const deficit = crop.rainfall_need[0] - monthlyRainfall;
      score += Math.max(0, 30 - deficit * 0.5);
    } else {
      const excess = monthlyRainfall - crop.rainfall_need[1];
      score += Math.max(0, 30 - excess * 0.3);
    }

    return Math.min(score, 100);
  }

  private static calculateSeasonality(crop: Crop, currentSeason: string): number {
    if (crop.seasonality.includes(currentSeason) || crop.seasonality.includes('annual') || crop.seasonality.includes('perennial')) {
      return 100;
    }
    
    // Check if it's close to the right season
    const seasonOrder = ['rabi', 'summer', 'kharif'];
    const currentIndex = seasonOrder.indexOf(currentSeason);
    
    for (const cropSeason of crop.seasonality) {
      const cropIndex = seasonOrder.indexOf(cropSeason);
      if (cropIndex !== -1) {
        const distance = Math.abs(currentIndex - cropIndex);
        if (distance === 1) return 60; // Adjacent season
      }
    }
    
    return 20; // Wrong season
  }

  private static calculateProfitPotential(crop: Crop): number {
    const profitScores = {
      'high': 100,
      'medium': 70,
      'low': 40
    };
    return profitScores[crop.profit_potential] || 50;
  }

  private static calculateRiskScore(crop: Crop, weather: CurrentWeather, forecast: WeatherForecast[]): number {
    let riskScore = 100;

    // Harvest sensitivity risk
    const sensitivityRisk = {
      'low': 0,
      'medium': 10,
      'high': 25
    };
    riskScore -= sensitivityRisk[crop.harvest_sensitivity];

    // Weather risk
    const extremeWeatherDays = forecast.filter(day => 
      day.maxTemp > 40 || day.minTemp < 10 || day.rainfall > 50
    ).length;
    riskScore -= extremeWeatherDays * 5;

    // Duration risk (longer crops have more exposure)
    if (crop.duration_days[0] > 120) {
      riskScore -= 10;
    }

    return Math.max(riskScore, 0);
  }

  private static createRecommendation(
    crop: Crop,
    score: number,
    soil: SoilData,
    weather: CurrentWeather,
    forecast: WeatherForecast[],
    season: string
  ): CropRecommendation {
    const rationale: string[] = [];
    const risks: string[] = [];
    const advantages: string[] = [];

    // Generate rationale
    if (score > 80) {
      rationale.push(`Excellent match for current conditions (${score}% compatibility)`);
    } else if (score > 60) {
      rationale.push(`Good match for current conditions (${score}% compatibility)`);
    } else {
      rationale.push(`Moderate suitability (${score}% compatibility)`);
    }

    // Soil rationale
    if (crop.soil_ok.includes(soil.type.toLowerCase())) {
      rationale.push(`Ideal soil type: ${soil.type}`);
      advantages.push('Perfect soil compatibility');
    }

    if (soil.pH >= crop.pH[0] && soil.pH <= crop.pH[1]) {
      advantages.push(`Optimal pH level (${soil.pH})`);
    } else {
      risks.push(`pH level (${soil.pH}) is outside ideal range (${crop.pH[0]}-${crop.pH[1]})`);
    }

    // Weather rationale
    if (weather.temperature >= crop.ideal_temp[0] && weather.temperature <= crop.ideal_temp[1]) {
      advantages.push('Favorable temperature conditions');
    } else {
      risks.push('Temperature conditions not optimal');
    }

    // Season rationale
    if (crop.seasonality.includes(season)) {
      advantages.push(`Perfect timing for ${season} season`);
    } else {
      risks.push(`Not the ideal season (best: ${crop.seasonality.join(', ')})`);
    }

    // Profit and risk assessment
    if (crop.profit_potential === 'high') {
      advantages.push('High profit potential');
    }

    if (crop.harvest_sensitivity === 'high') {
      risks.push('Sensitive to harvest timing and weather');
    }

    return {
      crop,
      score,
      rationale,
      expectedYield: crop.yield_potential,
      profitHint: this.getProfitHint(crop),
      sowingWindow: this.getSowingWindow(crop, season),
      harvestWindow: this.getHarvestWindow(crop, season),
      risks,
      advantages,
      irrigationNeeds: crop.irrigation_notes
    };
  }

  private static getProfitHint(crop: Crop): string {
    const profitHints = {
      'high': 'Expected high returns with good market demand',
      'medium': 'Stable returns with moderate investment',
      'low': 'Lower returns but minimal risk and investment'
    };
    return profitHints[crop.profit_potential] || 'Market research recommended';
  }

  private static getSowingWindow(crop: Crop, season: string): string {
    const sowingWindows: { [key: string]: string } = {
      'kharif': 'June - July',
      'rabi': 'October - December',
      'summer': 'February - April',
      'annual': 'Based on local conditions',
      'perennial': 'Year-round planting possible'
    };

    for (const cropSeason of crop.seasonality) {
      if (sowingWindows[cropSeason]) {
        return sowingWindows[cropSeason];
      }
    }
    return 'Consult local agricultural officer';
  }

  private static getHarvestWindow(crop: Crop, season: string): string {
    if (crop.duration_days[0] === 0) return 'Perennial - multiple harvests';
    
    const avgDuration = (crop.duration_days[0] + crop.duration_days[1]) / 2;
    const sowingMonth = this.getSeasonStartMonth(season);
    const harvestMonth = (sowingMonth + Math.ceil(avgDuration / 30) - 1) % 12 + 1;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[harvestMonth - 1]} - ${months[harvestMonth % 12]}`;
  }

  private static getCurrentSeason(month: number): string {
    if (month >= 11 || month <= 3) return 'rabi';
    if (month >= 4 && month <= 6) return 'summer';
    return 'kharif';
  }

  private static getSeasonStartMonth(season: string): number {
    const seasonStarts: { [key: string]: number } = {
      'kharif': 6, // June
      'rabi': 11, // November
      'summer': 3, // March
      'annual': new Date().getMonth() + 1,
      'perennial': new Date().getMonth() + 1
    };
    return seasonStarts[season] || new Date().getMonth() + 1;
  }

  private static groupBySeason(recommendations: CropRecommendation[]): { [season: string]: CropRecommendation[] } {
    const grouped: { [season: string]: CropRecommendation[] } = {
      'kharif': [],
      'rabi': [],
      'summer': [],
      'annual': [],
      'perennial': []
    };

    for (const rec of recommendations) {
      for (const season of rec.crop.seasonality) {
        if (grouped[season]) {
          grouped[season].push(rec);
        }
      }
    }

    // Sort each season by score and take top 3
    Object.keys(grouped).forEach(season => {
      grouped[season] = grouped[season]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    });

    return grouped;
  }
}