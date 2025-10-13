import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Camera, AlertTriangle, CheckCircle, Info, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetectionResult {
  disease: string;
  confidence: number;
  severity: string;
  causes: string[];
  symptoms: string[];
  prevention: string[];
  treatment: string[];
}

const DiseaseDetectionTab = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    
    // Simulate disease detection analysis
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock result based on common plant diseases
    const mockResults: DetectionResult[] = [
      {
        disease: "Late Blight (Phytophthora infestans)",
        confidence: 87.3,
        severity: "High",
        causes: [
          "Cool, moist weather conditions",
          "High humidity (>90%)",
          "Poor air circulation",
          "Infected seed potatoes",
          "Contaminated soil"
        ],
        symptoms: [
          "Dark, water-soaked spots on leaves",
          "White fuzzy growth on leaf undersides",
          "Brown lesions spreading rapidly",
          "Yellowing and wilting of affected areas",
          "Foul odor from infected tissue"
        ],
        prevention: [
          "Plant resistant varieties",
          "Ensure proper spacing for air circulation",
          "Avoid overhead watering",
          "Remove plant debris regularly",
          "Use certified disease-free seeds"
        ],
        treatment: [
          "Apply copper-based fungicides",
          "Remove and destroy infected plants",
          "Improve drainage and air circulation",
          "Apply preventive fungicide sprays",
          "Consider biological control agents"
        ]
      },
      {
        disease: "Powdery Mildew",
        confidence: 92.1,
        severity: "Medium",
        causes: [
          "High humidity with dry conditions",
          "Poor air circulation",
          "Overcrowded plants",
          "Stress from drought or poor nutrition"
        ],
        symptoms: [
          "White powdery coating on leaves",
          "Yellowing of affected leaves",
          "Stunted growth",
          "Distorted leaves and shoots"
        ],
        prevention: [
          "Ensure adequate spacing",
          "Improve air circulation",
          "Avoid overhead watering",
          "Regular monitoring and early detection"
        ],
        treatment: [
          "Apply sulfur-based fungicides",
          "Use neem oil treatments",
          "Improve ventilation",
          "Remove severely affected parts"
        ]
      }
    ];

    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
    setResult(randomResult);
    setIsAnalyzing(false);

    toast({
      title: "Analysis Complete",
      description: `Disease detected with ${randomResult.confidence}% confidence`,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              {selectedImage ? (
                <div className="space-y-4">
                  <img 
                    src={selectedImage} 
                    alt="Uploaded plant" 
                    className="max-h-64 mx-auto rounded-lg shadow-soft"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                    <Button 
                      onClick={analyzeImage}
                      disabled={isAnalyzing}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Disease"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Upload Plant Image</p>
                    <p className="text-sm text-muted-foreground">
                      Take a clear photo of the affected plant area
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
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {result && (
        <div className="space-y-4">
          {/* Detection Summary */}
          <Card className="shadow-emphasis">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                Detection Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-destructive">{result.disease}</h3>
                  <Badge variant={getSeverityColor(result.severity)}>
                    {result.severity} Risk
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Confidence: {result.confidence}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Causes */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-primary" />
                  Causes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.causes.map((cause, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {cause}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Symptoms */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.symptoms.map((symptom, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Prevention */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-accent" />
                  Prevention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.prevention.map((prevention, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      {prevention}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Treatment */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Treatment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.treatment.map((treatment, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {treatment}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
export default DiseaseDetectionTab;
export { DiseaseDetectionTab };