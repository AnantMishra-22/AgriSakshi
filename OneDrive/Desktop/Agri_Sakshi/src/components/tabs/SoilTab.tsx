import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mountain, 
  Beaker, 
  Droplets, 
  Leaf, 
  AlertCircle, 
  CheckCircle2,
  MapPin,
  TestTube
} from "lucide-react";
import { SoilService, SoilData, SoilType } from '@/services/soilService';
import { LocationData } from '@/services/locationService';
import { useToast } from "@/hooks/use-toast";

interface SoilTabProps {
  location: LocationData | null;
  initialSoilData?: SoilData | null;
}

export const SoilTab = ({ location, initialSoilData }: SoilTabProps) => {
  const [soilData, setSoilData] = useState<SoilData | null>(initialSoilData || null);
  const [soilTypes, setSoilTypes] = useState<SoilType[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'auto' | 'manual'>('auto');
  
  // Manual input states
  const [manualSoilType, setManualSoilType] = useState('');
  const [manualPH, setManualPH] = useState('');
  const [manualNitrogen, setManualNitrogen] = useState('');
  const [manualPhosphorous, setManualPhosphorous] = useState('');
  const [manualPotassium, setManualPotassium] = useState('');
  const [manualTexture, setManualTexture] = useState<'sandy' | 'loamy' | 'clayey'>('loamy');
  
  const { toast } = useToast();

  useEffect(() => {
    setSoilTypes(SoilService.getSoilTypes());
    if (initialSoilData) {
      setSoilData(initialSoilData);
    }
  }, [initialSoilData]);

  const detectSoilAuto = async () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable location access to detect soil type automatically.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const detectedSoil = await SoilService.detectSoilType(
        location.latitude,
        location.longitude,
        location.district,
        location.state
      );
      setSoilData(detectedSoil);
      toast({
        title: "Soil Detected",
        description: `Detected ${detectedSoil.type} soil with ${detectedSoil.confidence}% confidence.`,
      });
    } catch (error) {
      toast({
        title: "Detection Failed",
        description: "Unable to detect soil type. Please use manual mode.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitManualData = () => {
    if (!manualSoilType || !manualPH || !manualNitrogen || !manualPhosphorous || !manualPotassium) {
      toast({
        title: "Missing Data",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    const manualSoil = SoilService.createManualSoilData(
      manualSoilType,
      parseFloat(manualPH),
      parseFloat(manualNitrogen),
      parseFloat(manualPhosphorous),
      parseFloat(manualPotassium),
      manualTexture
    );

    setSoilData(manualSoil);
    toast({
      title: "Soil Data Updated",
      description: "Manual soil data has been saved successfully.",
    });
  };

  const getHealthScore = (soil: SoilData): { score: number; status: string; color: string } => {
    let score = 0;
    
    // pH score
    if (soil.pH >= 6.0 && soil.pH <= 7.5) score += 25;
    else if (soil.pH >= 5.5 && soil.pH <= 8.0) score += 15;
    else score += 5;
    
    // Nitrogen score
    if (soil.nitrogen > 300) score += 25;
    else if (soil.nitrogen > 200) score += 15;
    else score += 5;
    
    // Phosphorous score
    if (soil.phosphorous > 30) score += 25;
    else if (soil.phosphorous > 20) score += 15;
    else score += 5;
    
    // Potassium score
    if (soil.potassium > 250) score += 25;
    else if (soil.potassium > 150) score += 15;
    else score += 5;
    
    let status = 'Poor';
    let color = 'destructive';
    
    if (score >= 75) {
      status = 'Excellent';
      color = 'success';
    } else if (score >= 60) {
      status = 'Good';
      color = 'success';
    } else if (score >= 40) {
      status = 'Fair';
      color = 'warning';
    }
    
    return { score, status, color };
  };

  const getNutrientStatus = (value: number, type: 'N' | 'P' | 'K') => {
    const thresholds = {
      N: { low: 200, medium: 300, high: 400 },
      P: { low: 20, medium: 30, high: 50 },
      K: { low: 150, medium: 250, high: 400 }
    };
    
    const threshold = thresholds[type];
    if (value < threshold.low) return { status: 'Low', color: 'destructive' };
    if (value < threshold.medium) return { status: 'Medium', color: 'warning' };
    if (value < threshold.high) return { status: 'Good', color: 'success' };
    return { status: 'High', color: 'success' };
  };

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center">
          <Mountain className="w-6 h-6 mr-2 text-warning" />
          Soil Analysis
        </h2>
        <p className="text-muted-foreground">Understand your soil for better crop selection</p>
      </div>

      {/* Mode Selection */}
      <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'auto' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto">Auto Detection</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        </TabsList>

        {/* Auto Detection Mode */}
        <TabsContent value="auto" className="space-y-4">
          <Card className="p-4 shadow-soft">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Location-Based Detection</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We'll analyze your location to predict soil type and characteristics
                </p>
                {location && (
                  <p className="text-xs text-muted-foreground">
                    Current location: {location.district}, {location.state}
                  </p>
                )}
              </div>
              <Button 
                onClick={detectSoilAuto} 
                disabled={loading || !location}
                className="w-full"
              >
                {loading ? 'Detecting...' : 'Detect Soil Type'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Manual Entry Mode */}
        <TabsContent value="manual" className="space-y-4">
          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-4 flex items-center">
              <TestTube className="w-5 h-5 mr-2" />
              Enter Soil Test Results
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="soil-type">Soil Type</Label>
                <Select value={manualSoilType} onValueChange={setManualSoilType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select soil type" />
                  </SelectTrigger>
                  <SelectContent>
                    {soilTypes.map((type) => (
                      <SelectItem key={type.name} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ph">pH Level</Label>
                  <Input
                    id="ph"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={manualPH}
                    onChange={(e) => setManualPH(e.target.value)}
                    placeholder="6.5"
                  />
                </div>
                <div>
                  <Label htmlFor="texture">Texture</Label>
                  <Select value={manualTexture} onValueChange={(value) => setManualTexture(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandy">Sandy</SelectItem>
                      <SelectItem value="loamy">Loamy</SelectItem>
                      <SelectItem value="clayey">Clayey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="nitrogen">Nitrogen (kg/ha)</Label>
                  <Input
                    id="nitrogen"
                    type="number"
                    value={manualNitrogen}
                    onChange={(e) => setManualNitrogen(e.target.value)}
                    placeholder="300"
                  />
                </div>
                <div>
                  <Label htmlFor="phosphorous">Phosphorous (kg/ha)</Label>
                  <Input
                    id="phosphorous"
                    type="number"
                    value={manualPhosphorous}
                    onChange={(e) => setManualPhosphorous(e.target.value)}
                    placeholder="35"
                  />
                </div>
                <div>
                  <Label htmlFor="potassium">Potassium (kg/ha)</Label>
                  <Input
                    id="potassium"
                    type="number"
                    value={manualPotassium}
                    onChange={(e) => setManualPotassium(e.target.value)}
                    placeholder="280"
                  />
                </div>
              </div>

              <Button onClick={submitManualData} className="w-full">
                Save Soil Data
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Soil Analysis Results */}
      {soilData && (
        <div className="space-y-4">
          {/* Soil Health Overview */}
          <Card className="p-4 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Soil Health Overview</h3>
              <Badge variant={getHealthScore(soilData).color as any}>
                {getHealthScore(soilData).status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium">Soil Type</p>
                <p className="text-lg">{soilData.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Detection Method</p>
                <p className="text-lg capitalize">{soilData.detectionMethod}</p>
              </div>
            </div>

            {soilData.detectionMethod === 'auto' && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Confidence: {soilData.confidence}%</span>
              </div>
            )}
          </Card>

          {/* Soil Properties */}
          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-4 flex items-center">
              <Beaker className="w-5 h-5 mr-2 text-info" />
              Soil Properties
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">pH Level</p>
                  <p className="text-sm text-muted-foreground">Soil acidity/alkalinity</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{soilData.pH}</p>
                  <Badge variant={soilData.pH >= 6.0 && soilData.pH <= 7.5 ? "default" : "secondary"}>
                    {soilData.pH < 6.0 ? 'Acidic' : soilData.pH > 7.5 ? 'Alkaline' : 'Neutral'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">Nitrogen</p>
                  <p className="text-lg font-semibold">{soilData.nitrogen}</p>
                  <Badge variant={getNutrientStatus(soilData.nitrogen, 'N').color as any} className="text-xs">
                    {getNutrientStatus(soilData.nitrogen, 'N').status}
                  </Badge>
                </div>
                
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">Phosphorous</p>
                  <p className="text-lg font-semibold">{soilData.phosphorous}</p>
                  <Badge variant={getNutrientStatus(soilData.phosphorous, 'P').color as any} className="text-xs">
                    {getNutrientStatus(soilData.phosphorous, 'P').status}
                  </Badge>
                </div>
                
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">Potassium</p>
                  <p className="text-lg font-semibold">{soilData.potassium}</p>
                  <Badge variant={getNutrientStatus(soilData.potassium, 'K').color as any} className="text-xs">
                    {getNutrientStatus(soilData.potassium, 'K').status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Organic Matter</p>
                  <p className="text-lg">{soilData.organicMatter}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Texture</p>
                  <p className="text-lg capitalize">{soilData.texture}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Drainage</p>
                  <p className="text-lg capitalize">{soilData.drainage}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Salinity</p>
                  <p className="text-lg capitalize">{soilData.salinity}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-4 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-success" />
              Soil Improvement Recommendations
            </h3>
            
            <div className="space-y-2">
              {SoilService.getSoilRecommendations(soilData).map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-accent/5 rounded-lg">
                  <Leaf className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
    </div>
  );
};