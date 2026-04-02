// src/components/tabs/DiseaseDetectionTab.tsx
// Real plant disease detection powered by Claude Vision API.
// All mock data removed — actual AI analysis of uploaded images.

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload, Camera, AlertTriangle, CheckCircle, Info,
  Shield, Leaf, FlaskConical, Zap, Bug, Sprout
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectPlantDisease, DiseaseDetectionResult } from '@/services/diseaseService';

const DiseaseDetectionTab = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiseaseDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const detection = await detectPlantDisease(selectedImage);
      setResult(detection);
      toast({
        title: detection.isHealthy ? '✅ Plant appears healthy!' : `🔍 Disease detected`,
        description: detection.isHealthy
          ? 'No signs of disease found in this image.'
          : `${detection.disease} — ${detection.confidence}% confidence`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
      toast({
        title: 'Analysis failed',
        description: 'Could not analyse the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityVariant = (severity: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (severity) {
      case 'Critical': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      case 'Healthy': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-blue-600';
      case 'Healthy': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getPathogenIcon = (type: string) => {
    switch (type) {
      case 'Fungal': return <FlaskConical className="h-4 w-4" />;
      case 'Bacterial': return <Bug className="h-4 w-4" />;
      case 'Viral': return <Zap className="h-4 w-4" />;
      case 'Pest': return <Bug className="h-4 w-4" />;
      case 'Nutritional': return <Sprout className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-500';
    if (confidence >= 70) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div
      className="p-4 space-y-6 pb-20 min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('/src/components/images/op.jpg')` }}
    >
      <div className="space-y-6">

        {/* Upload Section */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              Plant Disease Detection
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload a clear photo of the affected plant — AI will diagnose it instantly
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-background/60">
                {selectedImage ? (
                  <div className="space-y-4">
                    <img
                      src={selectedImage}
                      alt="Uploaded plant"
                      className="max-h-72 mx-auto rounded-lg shadow-soft object-contain"
                    />
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Change Image
                      </Button>
                      <Button
                        onClick={analyzeImage}
                        disabled={isAnalyzing}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isAnalyzing ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            Analysing with AI...
                          </span>
                        ) : (
                          <>
                            <Leaf className="h-4 w-4 mr-2" />
                            Analyse Disease
                          </>
                        )}
                      </Button>
                    </div>
                    {isAnalyzing && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Claude Vision is examining your plant image...
                        </p>
                        <Progress value={undefined} className="h-1 animate-pulse" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <Camera className="h-14 w-14 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">Upload a Plant Photo</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Take a clear, well-lit photo of the affected leaf, stem, or fruit.
                        <br />
                        Supported: JPG, PNG, WEBP — max 10MB
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Image
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Tips */}
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="text-center p-2 bg-muted/30 rounded">
                  📸 Good lighting helps accuracy
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  🔍 Focus on affected area
                </div>
                <div className="text-center p-2 bg-muted/30 rounded">
                  🌿 Include healthy leaf for comparison
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Analysis Failed</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure the Supabase Edge Function is deployed and the API key is set.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Summary Card */}
            <Card className={`shadow-emphasis border-2 ${result.isHealthy ? 'border-green-400' : 'border-orange-400'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.isHealthy ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  )}
                  {result.isHealthy ? 'Plant is Healthy' : 'Disease Detected'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className={`text-xl font-bold ${getSeverityColor(result.severity)}`}>
                      {result.disease}
                    </h3>
                    {result.scientificName && result.scientificName !== 'N/A' && (
                      <p className="text-sm text-muted-foreground italic">{result.scientificName}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Crop: <span className="font-medium text-foreground">{result.cropIdentified}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getSeverityVariant(result.severity)}>
                      {result.severity} {result.isHealthy ? '' : 'Risk'}
                    </Badge>
                    {result.pathogenType !== 'None' && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getPathogenIcon(result.pathogenType)}
                        {result.pathogenType}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AI Confidence</span>
                    <span className="font-semibold">{result.confidence}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getConfidenceColor(result.confidence)}`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Urgency */}
                {!result.isHealthy && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-medium text-destructive flex items-center gap-1">
                      <Zap className="h-4 w-4" /> Urgency
                    </p>
                    <p className="text-sm mt-1">{result.urgency}</p>
                    {result.estimatedLossIfUntreated && (
                      <p className="text-xs text-muted-foreground mt-1">
                        If untreated: {result.estimatedLossIfUntreated}
                      </p>
                    )}
                  </div>
                )}

                {/* Favorable conditions */}
                {!result.isHealthy && result.favorableConditions && (
                  <div className="p-3 bg-muted/30 rounded-lg text-sm">
                    <span className="font-medium">Thrives in: </span>
                    <span className="text-muted-foreground">{result.favorableConditions}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detail grid */}
            {!result.isHealthy && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Symptoms */}
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Symptoms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.symptoms.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Causes */}
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Info className="h-5 w-5 text-primary" />
                      Causes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.causes.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Organic Treatment */}
                <Card className="shadow-soft border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Leaf className="h-5 w-5 text-green-600" />
                      Organic / Biological Treatment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.organicTreatment.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Chemical Treatment */}
                <Card className="shadow-soft border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FlaskConical className="h-5 w-5 text-orange-600" />
                      Chemical Treatment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.chemicalTreatment.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3">
                      ⚠️ Always follow label instructions and wear protective gear.
                    </p>
                  </CardContent>
                </Card>

                {/* Prevention */}
                <Card className="shadow-soft md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Prevention for Next Season
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.prevention.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          {p}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Also affects */}
                {result.affectedCrops.length > 0 && (
                  <Card className="shadow-soft md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Other Crops at Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.affectedCrops.map((crop, i) => (
                          <Badge key={i} variant="outline">{crop}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Healthy state */}
            {result.isHealthy && (
              <Card className="border-green-400 bg-green-50/30">
                <CardContent className="p-6 text-center space-y-3">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-lg font-bold text-green-700">Your plant looks healthy!</h3>
                  <p className="text-sm text-muted-foreground">
                    No signs of disease were detected in this image.
                    Continue regular monitoring and maintain good agricultural practices.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-left mt-4">
                    <div className="p-2 bg-green-100/50 rounded">
                      <p className="font-medium text-green-700">Keep doing:</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• Regular field scouting</li>
                        <li>• Proper spacing for airflow</li>
                        <li>• Balanced fertilization</li>
                      </ul>
                    </div>
                    <div className="p-2 bg-blue-100/50 rounded">
                      <p className="font-medium text-blue-700">Watch out for:</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• Changes after rain</li>
                        <li>• Insect infestations</li>
                        <li>• Leaf discoloration</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiseaseDetectionTab;
export { DiseaseDetectionTab };
