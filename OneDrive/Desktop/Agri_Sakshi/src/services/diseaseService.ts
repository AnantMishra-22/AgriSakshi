// src/services/diseaseService.ts
// Real plant disease detection using Claude Vision API.
// Replaces the mock setTimeout approach in DiseaseDetectionTab.
//
// Accuracy strategy:
//  - Claude Vision identifies visual symptoms (lesions, discoloration, texture, pattern)
//  - System prompt biases strongly toward Indian crops and their common pathogens
//  - Structured JSON schema forces consistent, actionable output
//  - Confidence score reflects model certainty, not a hardcoded number
//  - Falls back gracefully if the image doesn't show a diseased plant

import { callClaude, parseClaudeJSON } from './apiClient';

export interface DiseaseDetectionResult {
  disease: string;
  scientificName: string;
  confidence: number; // 0–100
  severity: 'Healthy' | 'Low' | 'Medium' | 'High' | 'Critical';
  cropIdentified: string;
  pathogenType: 'Fungal' | 'Bacterial' | 'Viral' | 'Pest' | 'Nutritional' | 'Unknown' | 'None';
  causes: string[];
  symptoms: string[];
  prevention: string[];
  treatment: string[];
  organicTreatment: string[];
  chemicalTreatment: string[];
  urgency: string;
  estimatedLossIfUntreated: string;
  favorableConditions: string;
  affectedCrops: string[];
  isHealthy: boolean;
}

const DISEASE_SYSTEM_PROMPT = `You are an expert plant pathologist with 20+ years of experience diagnosing crop diseases in India.
You specialize in diseases affecting Indian crops including rice, wheat, maize, cotton, sugarcane, tomato, potato, chilli, soybean, groundnut, onion, mango, banana, and pulses.

You have deep knowledge of:
- Fungal diseases: blast, blight, rust, smut, wilt, anthracnose, powdery mildew, downy mildew, leaf spot
- Bacterial diseases: bacterial blight, bacterial wilt, canker, soft rot
- Viral diseases: mosaic virus, leaf curl, streak virus, tungro
- Pest damage: aphids, whitefly, stem borer, leaf miner, mites
- Nutritional deficiencies: nitrogen, iron, zinc, magnesium, potassium deficiencies

When analyzing images, look for:
- Lesion shape, color, margins, and distribution pattern
- Water-soaking, chlorosis, necrosis
- Fungal sporulation (white/gray/brown powder or fuzz)
- Wilting pattern (whole plant vs individual leaves)
- Vascular discoloration (stem cross-section appearance)

CRITICAL: Always respond with ONLY valid JSON. No markdown, no explanation text.`;

const DISEASE_ANALYSIS_PROMPT = `Analyze this plant image and provide a comprehensive disease diagnosis.

Look carefully at:
1. The type of plant/crop visible
2. Any abnormal coloration (yellowing, browning, blackening, white powder)
3. Lesion patterns (spots, blotches, streaks, rings)
4. Tissue condition (wilting, rotting, deformation)
5. Presence of mold, spores, or insect damage

Return ONLY this exact JSON structure (no extra fields, no markdown):
{
  "disease": "<Common disease name, e.g. 'Rice Blast' or 'Healthy Plant'>",
  "scientificName": "<Scientific name e.g. 'Magnaporthe oryzae' or 'N/A if healthy'>",
  "confidence": <integer 0-100>,
  "severity": "Healthy" | "Low" | "Medium" | "High" | "Critical",
  "cropIdentified": "<crop name identified in image>",
  "pathogenType": "Fungal" | "Bacterial" | "Viral" | "Pest" | "Nutritional" | "Unknown" | "None",
  "isHealthy": <true if plant appears healthy, false if disease detected>,
  "causes": ["<cause 1>", "<cause 2>", "<cause 3>"],
  "symptoms": ["<visible symptom 1>", "<visible symptom 2>", "<symptom 3>"],
  "prevention": ["<prevention step 1>", "<prevention step 2>", "<prevention step 3>"],
  "treatment": ["<general treatment 1>", "<treatment 2>"],
  "organicTreatment": ["<organic/biological control 1>", "<organic 2>"],
  "chemicalTreatment": ["<specific fungicide/bactericide/pesticide with dosage>", "<chemical 2>"],
  "urgency": "<one sentence: immediate action required or monitoring recommendation>",
  "estimatedLossIfUntreated": "<e.g. '30-50% yield loss within 2 weeks'>",
  "favorableConditions": "<weather/environmental conditions that promote this disease>",
  "affectedCrops": ["<other crops this disease affects>"]
}

Rules:
- confidence should be 85-98 only if you can clearly see disease symptoms
- confidence 60-84 if symptoms are visible but ambiguous
- confidence below 60 means the image is unclear or disease is not visible
- If the plant looks healthy, set isHealthy=true, disease="Healthy Plant", pathogenType="None", severity="Healthy"
- Be specific with chemical treatments: include active ingredient and approximate dosage
- All arrays must have at least 3 items`;

/**
 * Analyse a plant image for disease using Claude Vision.
 * @param imageDataUrl - The full data URL from FileReader (e.g. "data:image/jpeg;base64,...")
 */
export async function detectPlantDisease(
  imageDataUrl: string
): Promise<DiseaseDetectionResult> {
  // Parse the data URL
  const [header, base64Data] = imageDataUrl.split(',');
  if (!header || !base64Data) {
    throw new Error('Invalid image data URL');
  }

  // Extract media type (image/jpeg, image/png, image/webp)
  const mediaTypeMatch = header.match(/data:([^;]+);base64/);
  const mediaType = mediaTypeMatch?.[1] ?? 'image/jpeg';

  // Validate supported types
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const safeMediaType = supportedTypes.includes(mediaType) ? mediaType : 'image/jpeg';

  const raw = await callClaude({
    system: DISEASE_SYSTEM_PROMPT,
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: safeMediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: DISEASE_ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  });

  const result = parseClaudeJSON<DiseaseDetectionResult>(raw);

  // Validate and sanitize the response
  return sanitizeResult(result);
}

function sanitizeResult(raw: Partial<DiseaseDetectionResult>): DiseaseDetectionResult {
  const validSeverities = ['Healthy', 'Low', 'Medium', 'High', 'Critical'];
  const validPathogenTypes = ['Fungal', 'Bacterial', 'Viral', 'Pest', 'Nutritional', 'Unknown', 'None'];

  return {
    disease: raw.disease || 'Unknown',
    scientificName: raw.scientificName || 'N/A',
    confidence: Math.min(100, Math.max(0, Math.round(raw.confidence ?? 50))),
    severity: validSeverities.includes(raw.severity ?? '') ? (raw.severity as DiseaseDetectionResult['severity']) : 'Medium',
    cropIdentified: raw.cropIdentified || 'Unknown crop',
    pathogenType: validPathogenTypes.includes(raw.pathogenType ?? '') ? (raw.pathogenType as DiseaseDetectionResult['pathogenType']) : 'Unknown',
    isHealthy: raw.isHealthy ?? false,
    causes: Array.isArray(raw.causes) && raw.causes.length > 0 ? raw.causes : ['Could not determine causes'],
    symptoms: Array.isArray(raw.symptoms) && raw.symptoms.length > 0 ? raw.symptoms : ['See image for visible symptoms'],
    prevention: Array.isArray(raw.prevention) && raw.prevention.length > 0 ? raw.prevention : ['Consult local agricultural extension officer'],
    treatment: Array.isArray(raw.treatment) && raw.treatment.length > 0 ? raw.treatment : ['Consult agronomist'],
    organicTreatment: Array.isArray(raw.organicTreatment) && raw.organicTreatment.length > 0 ? raw.organicTreatment : ['Neem oil spray (3ml/L water)'],
    chemicalTreatment: Array.isArray(raw.chemicalTreatment) && raw.chemicalTreatment.length > 0 ? raw.chemicalTreatment : ['Consult agrochemical dealer for appropriate fungicide'],
    urgency: raw.urgency || 'Monitor the plant and consult a local agronomist.',
    estimatedLossIfUntreated: raw.estimatedLossIfUntreated || 'Variable — depends on spread rate',
    favorableConditions: raw.favorableConditions || 'High humidity and warm temperatures',
    affectedCrops: Array.isArray(raw.affectedCrops) ? raw.affectedCrops : [],
  };
}
