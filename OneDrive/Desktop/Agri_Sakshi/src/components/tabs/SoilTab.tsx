import { useState, useEffect, useRef, useCallback } from 'react';
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
  TestTube,
  Camera,
  FlipHorizontal,
  X,
  Info,
} from "lucide-react";
import { SoilService, SoilData, SoilType } from '@/services/soilService';
import { LocationData } from '@/services/locationService';
import { useToast } from "@/hooks/use-toast";

// ─── Chemical test types ─────────────────────────────────────────────────────

type ChemicalTestType = 'chloride' | 'nitrate' | 'phosphorus';

interface ChemicalResult {
  test: ChemicalTestType;
  concentration: number;   // mg/L or mg/kg
  unit: string;
  status: 'deficient' | 'low' | 'optimal' | 'high' | 'excess';
  color: string;           // hex matched
  confidence: number;
  recommendation: string;
}

// ─── Color reference tables (simplified colorimetric lookup) ─────────────────
// Each test maps RGB ranges → concentration ranges (industry-standard test kits)

const CHLORIDE_REFS = [
  { label: '0', conc: 0,   r: [240, 245], g: [245, 250], b: [248, 255] }, // near-clear
  { label: '50', conc: 50,  r: [200, 230], g: [220, 240], b: [180, 210] }, // faint yellow-green
  { label: '100', conc: 100, r: [150, 190], g: [200, 230], b: [120, 160] }, // light green
  { label: '200', conc: 200, r: [80, 130],  g: [160, 200], b: [70, 110]  }, // medium green
  { label: '500', conc: 500, r: [30, 80],   g: [110, 160], b: [30, 80]   }, // deep green/blue
];

const NITRATE_REFS = [
  { label: '0',   conc: 0,   r: [240, 255], g: [240, 255], b: [240, 255] }, // clear
  { label: '10',  conc: 10,  r: [220, 240], g: [210, 235], b: [180, 210] }, // pale pink
  { label: '25',  conc: 25,  r: [200, 225], g: [150, 185], b: [130, 165] }, // pink
  { label: '50',  conc: 50,  r: [185, 210], g: [90, 135],  b: [90, 130]  }, // rose
  { label: '100', conc: 100, r: [160, 195], g: [30, 80],   b: [60, 100]  }, // magenta
  { label: '200', conc: 200, r: [120, 165], g: [20, 55],   b: [80, 130]  }, // deep magenta
];

const PHOSPHORUS_REFS = [
  { label: '0',   conc: 0,   r: [240, 255], g: [240, 255], b: [240, 255] }, // clear
  { label: '5',   conc: 5,   r: [190, 220], g: [215, 240], b: [230, 255] }, // faint blue
  { label: '15',  conc: 15,  r: [120, 170], g: [170, 210], b: [220, 250] }, // light blue
  { label: '30',  conc: 30,  r: [60, 115],  g: [120, 170], b: [200, 240] }, // medium blue
  { label: '60',  conc: 60,  r: [20, 70],   g: [60, 110],  b: [170, 220] }, // deep blue
  { label: '100', conc: 100, r: [10, 50],   g: [20, 65],   b: [130, 190] }, // very deep blue
];

function colorDistance(r: number, g: number, b: number, ref: typeof CHLORIDE_REFS[0]) {
  const rc = (ref.r[0] + ref.r[1]) / 2;
  const gc = (ref.g[0] + ref.g[1]) / 2;
  const bc = (ref.b[0] + ref.b[1]) / 2;
  return Math.sqrt((r - rc) ** 2 + (g - gc) ** 2 + (b - bc) ** 2);
}

function interpolateConcentration(
  r: number, g: number, b: number,
  refs: typeof CHLORIDE_REFS
): { concentration: number; matchedColor: string; confidence: number } {
  // Find nearest two refs
  const dists = refs.map(ref => ({ ref, d: colorDistance(r, g, b, ref) }));
  dists.sort((a, b) => a.d - b.d);

  const best = dists[0];
  const second = dists[1];

  // Interpolate between the two closest
  const totalD = best.d + second.d;
  const w1 = totalD > 0 ? 1 - best.d / totalD : 1;
  const w2 = totalD > 0 ? 1 - second.d / totalD : 0;
  const concentration = Math.round((best.ref.conc * w1 + second.ref.conc * w2) / (w1 + w2));

  const matchedColor = `rgb(${r},${g},${b})`;
  const maxPossibleDist = Math.sqrt(3 * 255 ** 2);
  const confidence = Math.max(0, Math.round((1 - best.d / maxPossibleDist) * 100));

  return { concentration, matchedColor, confidence };
}

function classifyChloride(conc: number): ChemicalResult['status'] {
  if (conc < 10) return 'deficient';
  if (conc < 50) return 'low';
  if (conc <= 150) return 'optimal';
  if (conc <= 300) return 'high';
  return 'excess';
}

function classifyNitrate(conc: number): ChemicalResult['status'] {
  if (conc < 5) return 'deficient';
  if (conc < 20) return 'low';
  if (conc <= 50) return 'optimal';
  if (conc <= 100) return 'high';
  return 'excess';
}

function classifyPhosphorus(conc: number): ChemicalResult['status'] {
  if (conc < 5) return 'deficient';
  if (conc < 15) return 'low';
  if (conc <= 40) return 'optimal';
  if (conc <= 80) return 'high';
  return 'excess';
}

function getRecommendation(test: ChemicalTestType, status: ChemicalResult['status']): string {
  const map: Record<ChemicalTestType, Record<ChemicalResult['status'], string>> = {
    chloride: {
      deficient: 'Very low chloride — apply chloride-containing fertilizers (MOP). Essential for photosynthesis.',
      low:       'Slightly low chloride. Consider potassium chloride application.',
      optimal:   'Chloride levels are healthy. Maintain current soil management.',
      high:      'Elevated chloride. Reduce KCl-based fertilizers and improve drainage.',
      excess:    'Toxic chloride levels — leach soil with irrigation. Avoid chloride fertilizers.',
    },
    nitrate: {
      deficient: 'Severe nitrogen deficiency. Apply urea or ammonium nitrate immediately.',
      low:       'Low nitrate. Apply nitrogenous fertilizers or incorporate legumes.',
      optimal:   'Nitrate levels are ideal for most crops. Continue current regimen.',
      high:      'High nitrate — risk of leaching. Reduce N fertilizers, add cover crops.',
      excess:    'Excess nitrate — runoff/groundwater risk. Stop N application immediately.',
    },
    phosphorus: {
      deficient: 'Severe phosphorus deficiency. Apply DAP or SSP fertilizer urgently.',
      low:       'Low phosphorus. Apply phosphatic fertilizer and improve soil organic matter.',
      optimal:   'Phosphorus is at optimal level. No corrective action needed.',
      high:      'High phosphorus — reduce P fertilizers. May inhibit zinc/iron uptake.',
      excess:    'Excess phosphorus causing micronutrient lockout. Avoid further P application.',
    },
  };
  return map[test][status];
}

function statusColor(status: ChemicalResult['status']): string {
  return {
    deficient: 'destructive',
    low:       'secondary',
    optimal:   'default',
    high:      'warning' as any,
    excess:    'destructive',
  }[status];
}

// ─── Camera component ────────────────────────────────────────────────────────

interface CameraAnalyzerProps {
  testType: ChemicalTestType;
  onResult: (result: ChemicalResult) => void;
  onClose: () => void;
}

const testInstructions: Record<ChemicalTestType, { title: string; steps: string[]; tubeColor: string }> = {
  chloride: {
    title: 'Chloride Test (AgNO₃ method)',
    steps: [
      'Collect 10 mL of soil extract or water sample in a clear glass tube.',
      'Add 3 drops of silver nitrate (AgNO₃) reagent.',
      'Shake gently and wait 2 minutes.',
      'Hold tube against a white background in good daylight.',
      'Point camera at the solution and tap "Capture".',
    ],
    tubeColor: 'Expected: clear → pale white → milky white with increasing Cl⁻',
  },
  nitrate: {
    title: 'Nitrate Test (Griess Reagent)',
    steps: [
      'Collect 10 mL of soil extract in a clear glass tube.',
      'Add 1 mL of Griess Reagent A, mix well.',
      'Add 1 mL of Griess Reagent B, mix.',
      'Wait 5 minutes for color to develop.',
      'Hold tube against white background and tap "Capture".',
    ],
    tubeColor: 'Expected: clear → pale pink → deep magenta with increasing NO₃⁻',
  },
  phosphorus: {
    title: 'Phosphorus Test (Molybdenum Blue)',
    steps: [
      'Collect 10 mL of filtered soil extract.',
      'Add 1 mL ammonium molybdate reagent.',
      'Add 3 drops ascorbic acid solution.',
      'Wait 10 minutes for blue color to develop.',
      'Hold tube in good light and tap "Capture".',
    ],
    tubeColor: 'Expected: clear → light blue → deep blue with increasing PO₄³⁻',
  },
};

const CameraAnalyzer = ({ testType, onResult, onClose }: CameraAnalyzerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const info = testInstructions[testType];

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setCameraError(null);
    } catch (err: any) {
      setCameraError('Camera access denied. Please allow camera permissions and try again.');
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    // Sample a central 60×60 region (where the test tube solution should be)
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const size = 60;
    const imageData = ctx.getImageData(cx - size / 2, cy - size / 2, size, size);
    const data = imageData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    const px = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
    }
    const avgR = Math.round(totalR / px);
    const avgG = Math.round(totalG / px);
    const avgB = Math.round(totalB / px);

    const refs =
      testType === 'chloride' ? CHLORIDE_REFS :
      testType === 'nitrate' ? NITRATE_REFS :
      PHOSPHORUS_REFS;

    const classify =
      testType === 'chloride' ? classifyChloride :
      testType === 'nitrate' ? classifyNitrate :
      classifyPhosphorus;

    const units: Record<ChemicalTestType, string> = {
      chloride: 'mg/L',
      nitrate: 'mg/L',
      phosphorus: 'mg/kg',
    };

    setAnalyzing(true);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCaptured(dataUrl);

    // Stop live stream
    stream?.getTracks().forEach(t => t.stop());

    setTimeout(() => {
      const { concentration, matchedColor, confidence } = interpolateConcentration(avgR, avgG, avgB, refs);
      const status = classify(concentration);
      const result: ChemicalResult = {
        test: testType,
        concentration,
        unit: units[testType],
        status,
        color: matchedColor,
        confidence,
        recommendation: getRecommendation(testType, status),
      };
      setAnalyzing(false);
      onResult(result);
    }, 800);
  };

  const retake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <h3 className="font-bold text-lg">{info.title}</h3>
          <p className="text-xs text-white/60">{info.tubeColor}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions strip */}
      <div className="px-4 pb-2">
        <div className="bg-white/10 rounded-lg p-3 text-white text-xs space-y-1">
          {info.steps.map((step, i) => (
            <p key={i}><span className="font-bold text-yellow-300">{i + 1}.</span> {step}</p>
          ))}
        </div>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="text-white text-center px-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-red-300">{cameraError}</p>
          </div>
        ) : captured ? (
          <img src={captured} alt="Captured" className="max-h-full max-w-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full object-cover"
          />
        )}

        {/* Targeting reticle */}
        {!captured && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 border-2 border-yellow-300 rounded-full opacity-80" />
            <div className="absolute w-1 h-1 bg-yellow-300 rounded-full" />
            <p className="absolute bottom-16 text-yellow-300 text-xs font-medium">
              Center the test tube solution in the circle
            </p>
          </div>
        )}

        {analyzing && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p>Analyzing color...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center justify-center gap-6">
        {!captured ? (
          <>
            <button
              onClick={flipCamera}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <FlipHorizontal className="w-6 h-6" />
            </button>
            <button
              onClick={captureAndAnalyze}
              disabled={!!cameraError}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/40 hover:scale-105 transition-transform disabled:opacity-40"
            >
              <Camera className="w-8 h-8 text-black mx-auto" />
            </button>
            <div className="w-12" /> {/* spacer */}
          </>
        ) : (
          <button
            onClick={retake}
            className="px-6 py-3 bg-white/20 text-white rounded-full hover:bg-white/30"
          >
            Retake Photo
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// ─── Chemical Test Panel ─────────────────────────────────────────────────────

const ChemicalTestPanel = () => {
  const [activeTest, setActiveTest] = useState<ChemicalTestType | null>(null);
  const [results, setResults] = useState<Partial<Record<ChemicalTestType, ChemicalResult>>>({});
  const { toast } = useToast();

  const tests: { type: ChemicalTestType; label: string; icon: string; description: string }[] = [
    {
      type: 'chloride',
      label: 'Chloride',
      icon: '🧪',
      description: 'Cl⁻ ion concentration — essential for plant osmosis & disease resistance',
    },
    {
      type: 'nitrate',
      label: 'Nitrate',
      icon: '🌿',
      description: 'NO₃⁻ nitrogen — primary nutrient driving vegetative growth',
    },
    {
      type: 'phosphorus',
      label: 'Phosphorus',
      icon: '⚗️',
      description: 'PO₄³⁻ — critical for root development, flowering & fruiting',
    },
  ];

  const handleResult = (result: ChemicalResult) => {
    setResults(prev => ({ ...prev, [result.test]: result }));
    setActiveTest(null);
    toast({
      title: `${result.test.charAt(0).toUpperCase() + result.test.slice(1)} Test Complete`,
      description: `${result.concentration} ${result.unit} — ${result.status} (${result.confidence}% confidence)`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Prepare your chemical test kit reagents first. Point your camera at the colored test tube solution
            and the app will estimate concentration from solution color using standard colorimetric reference ranges.
          </p>
        </div>
      </Card>

      {/* Test buttons */}
      <div className="grid grid-cols-1 gap-3">
        {tests.map(({ type, label, icon, description }) => {
          const result = results[type];
          return (
            <Card key={type} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <h4 className="font-semibold">{label} Test</h4>
                    {result && (
                      <Badge variant={statusColor(result.status) as any} className="text-xs">
                        {result.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>

                  {result && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-3">
                        {/* Color swatch */}
                        <div
                          className="w-10 h-10 rounded-full border-2 border-white shadow-md flex-shrink-0"
                          style={{ backgroundColor: result.color }}
                        />
                        <div>
                          <p className="font-bold text-lg">
                            {result.concentration} <span className="text-sm font-normal text-muted-foreground">{result.unit}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{result.confidence}% confidence</p>
                        </div>
                      </div>
                      <div className="p-2 bg-accent/5 rounded-lg">
                        <p className="text-xs">{result.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={result ? 'outline' : 'default'}
                  onClick={() => setActiveTest(type)}
                  className="shrink-0"
                >
                  <Camera className="w-4 h-4 mr-1" />
                  {result ? 'Re-test' : 'Start Test'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary card if all done */}
      {Object.keys(results).length === 3 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            All Chemical Tests Complete
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(results).map(r => (
              <div key={r!.test} className="text-center bg-white rounded-lg p-2 shadow-sm">
                <p className="text-xs text-muted-foreground capitalize">{r!.test}</p>
                <p className="font-bold text-sm">{r!.concentration} {r!.unit}</p>
                <Badge variant={statusColor(r!.status) as any} className="text-xs mt-1">
                  {r!.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Camera overlay */}
      {activeTest && (
        <CameraAnalyzer
          testType={activeTest}
          onResult={handleResult}
          onClose={() => setActiveTest(null)}
        />
      )}
    </div>
  );
};

// ─── Main SoilTab component ──────────────────────────────────────────────────

interface SoilTabProps {
  location: LocationData | null;
  initialSoilData?: SoilData | null;
}

export const SoilTab = ({ location, initialSoilData }: SoilTabProps) => {
  const [soilData, setSoilData] = useState<SoilData | null>(initialSoilData || null);
  const [soilTypes, setSoilTypes] = useState<SoilType[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'auto' | 'manual' | 'chemical'>('auto');

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
    } catch {
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
    if (soil.pH >= 6.0 && soil.pH <= 7.5) score += 25;
    else if (soil.pH >= 5.5 && soil.pH <= 8.0) score += 15;
    else score += 5;
    if (soil.nitrogen > 300) score += 25;
    else if (soil.nitrogen > 200) score += 15;
    else score += 5;
    if (soil.phosphorous > 30) score += 25;
    else if (soil.phosphorous > 20) score += 15;
    else score += 5;
    if (soil.potassium > 250) score += 25;
    else if (soil.potassium > 150) score += 15;
    else score += 5;

    let status = 'Poor';
    let color = 'destructive';
    if (score >= 75) { status = 'Excellent'; color = 'success'; }
    else if (score >= 60) { status = 'Good'; color = 'success'; }
    else if (score >= 40) { status = 'Fair'; color = 'warning'; }
    return { score, status, color };
  };

  const getNutrientStatus = (value: number, type: 'N' | 'P' | 'K') => {
    const thresholds = {
      N: { low: 200, medium: 300, high: 400 },
      P: { low: 20,  medium: 30,  high: 50  },
      K: { low: 150, medium: 250, high: 400 },
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

        {/* Mode Selection — 3 tabs now */}
        <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auto">Auto Detect</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="chemical" className="flex items-center gap-1">
              <Beaker className="w-3 h-3" />
              Chemical Test
            </TabsTrigger>
          </TabsList>

          {/* ── Auto Detection ── */}
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

          {/* ── Manual Entry ── */}
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
                      id="ph" type="number" step="0.1" min="0" max="14"
                      value={manualPH} onChange={(e) => setManualPH(e.target.value)}
                      placeholder="6.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="texture">Texture</Label>
                    <Select value={manualTexture} onValueChange={(value) => setManualTexture(value as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input id="nitrogen" type="number" value={manualNitrogen}
                      onChange={(e) => setManualNitrogen(e.target.value)} placeholder="300" />
                  </div>
                  <div>
                    <Label htmlFor="phosphorous">Phosphorous (kg/ha)</Label>
                    <Input id="phosphorous" type="number" value={manualPhosphorous}
                      onChange={(e) => setManualPhosphorous(e.target.value)} placeholder="35" />
                  </div>
                  <div>
                    <Label htmlFor="potassium">Potassium (kg/ha)</Label>
                    <Input id="potassium" type="number" value={manualPotassium}
                      onChange={(e) => setManualPotassium(e.target.value)} placeholder="280" />
                  </div>
                </div>

                <Button onClick={submitManualData} className="w-full">
                  Save Soil Data
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── Chemical Test (NEW) ── */}
          <TabsContent value="chemical" className="space-y-4">
            <ChemicalTestPanel />
          </TabsContent>
        </Tabs>

        {/* ── Soil Analysis Results (same as before) ── */}
        {soilData && (
          <div className="space-y-4">
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
                  {(['N', 'P', 'K'] as const).map(nutrient => {
                    const val = nutrient === 'N' ? soilData.nitrogen : nutrient === 'P' ? soilData.phosphorous : soilData.potassium;
                    const ns = getNutrientStatus(val, nutrient);
                    return (
                      <div key={nutrient} className="text-center p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium">
                          {nutrient === 'N' ? 'Nitrogen' : nutrient === 'P' ? 'Phosphorous' : 'Potassium'}
                        </p>
                        <p className="text-lg font-semibold">{val}</p>
                        <Badge variant={ns.color as any} className="text-xs">{ns.status}</Badge>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm font-medium mb-1">Organic Matter</p><p className="text-lg">{soilData.organicMatter}%</p></div>
                  <div><p className="text-sm font-medium mb-1">Texture</p><p className="text-lg capitalize">{soilData.texture}</p></div>
                  <div><p className="text-sm font-medium mb-1">Drainage</p><p className="text-lg capitalize">{soilData.drainage}</p></div>
                  <div><p className="text-sm font-medium mb-1">Salinity</p><p className="text-lg capitalize">{soilData.salinity}</p></div>
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-soft">
              <h3 className="font-semibold mb-4 flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-success" />
                Soil Improvement Recommendations
              </h3>

              <div className="space-y-2">
                {SoilService.getSoilRecommendations(soilData).map((rec, i) => (
                  <div key={i} className="flex items-start space-x-2 p-2 bg-accent/5 rounded-lg">
                    <Leaf className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
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
