export interface Crop {
  id: string;
  name: string;
  duration_days: [number, number]; // [min, max]
  ideal_temp: [number, number]; // [min, max] in Celsius
  rainfall_need: [number, number]; // [min, max] in cm
  soil_ok: string[]; // compatible soil types
  pH: [number, number]; // [min, max]
  irrigation_notes: string;
  harvest_sensitivity: 'low' | 'medium' | 'high';
  seasonality: string[];
  category: 'cereal' | 'pulse' | 'oilseed' | 'cash' | 'plantation' | 'vegetable' | 'fruit';
  yield_potential: string; // expected yield range
  profit_potential: 'low' | 'medium' | 'high';
  guide?: CropGuide;
}

export interface CropGuide {
  planting: {
    seedRate: string;
    spacing: string;
    depth: string;
    method: string;
    bestTime: string;
  };
  irrigation: {
    frequency: string;
    amount: string;
    criticalStages: string[];
    method: string;
  };
  fertilization: {
    organic: string[];
    chemical: {
      nitrogen: string;
      phosphorous: string;
      potassium: string;
    };
    schedule: string[];
  };
  pestManagement: {
    commonPests: string[];
    pesticides: string[];
    naturalRemedies: string[];
  };
  diseases: {
    commonDiseases: string[];
    symptoms: string[];
    treatment: string[];
    prevention: string[];
  };
  harvesting: {
    indicators: string[];
    method: string;
    storage: string;
    processing: string;
  };
}

export const crops: Crop[] = [
  // Existing common crops
  {
    id: 'rice',
    name: 'Rice',
    duration_days: [120, 150],
    ideal_temp: [20, 35],
    rainfall_need: [100, 200],
    soil_ok: ['alluvial', 'clay', 'loam'],
    pH: [5.5, 7.0],
    irrigation_notes: 'Requires standing water, high water requirement',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'rabi'],
    category: 'cereal',
    yield_potential: '40-60 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '20-25 kg/hectare',
        spacing: '20x10 cm',
        depth: '2-3 cm',
        method: 'Transplanting or direct seeding',
        bestTime: 'June-July (Kharif), November-December (Rabi)'
      },
      irrigation: {
        frequency: 'Keep 2-5 cm standing water',
        amount: '1200-1500 mm total',
        criticalStages: ['Tillering', 'Panicle initiation', 'Flowering', 'Grain filling'],
        method: 'Flooding method'
      },
      fertilization: {
        organic: ['10-15 tons FYM/hectare', 'Green manure', 'Compost'],
        chemical: {
          nitrogen: '100-120 kg/hectare (split application)',
          phosphorous: '50-60 kg/hectare',
          potassium: '40-50 kg/hectare'
        },
        schedule: ['Base dose at planting', '25% N at tillering', '50% N at panicle initiation', '25% N at flowering']
      },
      pestManagement: {
        commonPests: ['Brown plant hopper', 'Stem borer', 'Leaf folder', 'Gall midge'],
        pesticides: ['Use locally registered, label-approved options for rice; follow PPE'],
        naturalRemedies: ['Neem oil', 'Trichoderma', 'Light traps', 'Pheromone traps']
      },
      diseases: {
        commonDiseases: ['Blast', 'Bacterial blight', 'Sheath blight', 'Brown spot'],
        symptoms: ['Leaf spots', 'Stem lesions', 'Panicle infection', 'Yellowing'],
        treatment: ['Use resistant varieties and label-approved fungicides as per threshold'],
        prevention: ['Resistant varieties', 'Proper spacing', 'Field sanitation', 'Seed treatment']
      },
      harvesting: {
        indicators: ['80% grains turn golden yellow', 'Moisture 20-25%'],
        method: 'Manual harvesting or combine harvester',
        storage: 'Dry to 12-14% moisture, store in dry place',
        processing: 'Threshing, winnowing, milling'
      }
    }
  },
  {
    id: 'wheat',
    name: 'Wheat',
    duration_days: [120, 150],
    ideal_temp: [15, 25],
    rainfall_need: [30, 75],
    soil_ok: ['alluvial', 'loam', 'black'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Moderate water requirement, drought tolerant',
    harvest_sensitivity: 'low',
    seasonality: ['rabi'],
    category: 'cereal',
    yield_potential: '25-45 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '100–125 kg/ha (100 for line; 120–125 for broadcast/late)',
        spacing: '20–22.5 cm between rows',
        depth: '4–5 cm',
        method: 'Line sowing preferred; broadcasting if needed',
        bestTime: 'North/Central: late Oct–late Nov; Peninsular: Nov–Dec'
      },
      irrigation: {
        frequency: '4–6 irrigations (avoid waterlogging)',
        amount: '400–500 mm total',
        criticalStages: [
          'Crown root initiation (~20–25 DAS)',
          'Tillering (~40–45 DAS)',
          'Jointing (~60–65 DAS)',
          'Flowering (~80–85 DAS)',
          'Grain filling (~100–105 DAS)'
        ],
        method: 'Furrow or sprinkler irrigation'
      },
      fertilization: {
        organic: ['8–10 tons FYM/ha', 'Compost (as available)'],
        chemical: {
          nitrogen: '80–120 kg/ha (split 1/3 + 1/3 + 1/3)',
          phosphorous: '40–60 kg/ha (basal)',
          potassium: '40–60 kg/ha (basal)'
        },
        schedule: [
          'Full P&K + 1/3 N at sowing',
          '1/3 N at first irrigation (CRI)',
          '1/3 N at jointing stage'
        ]
      },
      pestManagement: {
        commonPests: ['Aphids', 'Termites', 'Armyworm/Cutworm', 'Shoot fly (occasional, late sowing)'],
        pesticides: ['Use locally registered, label-approved options for wheat; follow PPE and PHI'],
        naturalRemedies: ['Neem-based biopesticides', 'Timely sowing', 'Field sanitation', 'Bird perches']
      },
      diseases: {
        commonDiseases: ['Leaf/Stripe/Stem rusts', 'Powdery mildew', 'Loose smut', 'Karnal bunt'],
        symptoms: ['Rust pustules on leaves/stems', 'White powdery growth', 'Black spores in grains'],
        treatment: ['Seed treatment; triazole sprays per label when thresholds exceeded'],
        prevention: ['Resistant varieties', 'Crop rotation', 'Timely sowing', 'Balanced nutrition & drainage']
      },
      harvesting: {
        indicators: ['Grains hard on pressing', 'Moisture ~20–22%', 'Golden yellow crop'],
        method: 'Combine harvester or manual cutting',
        storage: 'Dry to ~12% grain moisture; ventilated bins',
        processing: 'Threshing, cleaning, grading'
      }
    }
  },

  // NEW CROPS - Cereals
  {
    id: 'maize',
    name: 'Maize',
    duration_days: [90, 110],
    ideal_temp: [21, 27],
    rainfall_need: [60, 110],
    soil_ok: ['alluvial', 'sandy loam', 'black'],
    pH: [5.8, 7.0],
    irrigation_notes: 'Moderate water needs, sensitive to waterlogging',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'rabi', 'summer'],
    category: 'cereal',
    yield_potential: '50-80 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '15–20 kg/ha',
        spacing: '60 x 20 cm',
        depth: '4–5 cm',
        method: 'Dibbling or line sowing',
        bestTime: 'Kharif: Jun–Jul; Rabi (irrigated): Oct–Nov; Summer: Jan–Feb'
      },
      irrigation: {
        frequency: '4–6 irrigations depending on season',
        amount: '400–600 mm total',
        criticalStages: ['Knee-high', 'Tasseling', 'Silking', 'Grain filling'],
        method: 'Furrow/drip; avoid standing water'
      },
      fertilization: {
        organic: ['5–10 t FYM/ha'],
        chemical: {
          nitrogen: '120 kg/ha',
          phosphorous: '60 kg/ha',
          potassium: '40 kg/ha'
        },
        schedule: ['Basal P&K + 1/3 N at sowing', '1/3 N at knee-high', '1/3 N at tasseling']
      },
      pestManagement: {
        commonPests: ['Fall armyworm', 'Stem borer', 'Aphids', 'Shoot fly'],
        pesticides: ['Use locally registered, label-approved options for maize; follow PPE'],
        naturalRemedies: ['Pheromone traps', 'Neem-based sprays', 'Rogue egg masses/larvae']
      },
      diseases: {
        commonDiseases: ['Turcicum leaf blight', 'BLSB', 'Downy mildew'],
        symptoms: ['Elongated necrotic lesions', 'Sheath blight bands', 'Chlorosis/stunting'],
        treatment: ['Rotate crops; use resistant hybrids; apply label-approved fungicides if needed'],
        prevention: ['Seed treatment', 'Well-drained fields', 'Balanced nutrition']
      },
      harvesting: {
        indicators: ['Black layer formation', 'Husk dry', 'Grains hard'],
        method: 'Cobs harvested, dehusked and dried',
        storage: 'Dry grain to ≤13% moisture',
        processing: 'Shelling, cleaning, grading'
      }
    }
  },
  {
    id: 'barley',
    name: 'Barley',
    duration_days: [120, 150],
    ideal_temp: [12, 25],
    rainfall_need: [30, 90],
    soil_ok: ['alluvial', 'loam'],
    pH: [6.0, 7.8],
    irrigation_notes: 'Drought tolerant, low water requirement',
    harvest_sensitivity: 'low',
    seasonality: ['rabi'],
    category: 'cereal',
    yield_potential: '20-35 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '80–100 kg/ha',
        spacing: '20–22.5 cm rows',
        depth: '4–5 cm',
        method: 'Line sowing',
        bestTime: 'Nov (cool, dry conditions)'
      },
      irrigation: {
        frequency: '3–4 irrigations',
        amount: '250–350 mm',
        criticalStages: ['CRI', 'Tillering', 'Booting', 'Grain filling'],
        method: 'Furrow/sprinkler'
      },
      fertilization: {
        organic: ['5–8 t FYM/ha'],
        chemical: {
          nitrogen: '60 kg/ha',
          phosphorous: '30 kg/ha',
          potassium: '20 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at sowing', '1/2 N at tillering']
      },
      pestManagement: {
        commonPests: ['Aphids', 'Armyworm'],
        pesticides: ['Use locally registered options for barley; follow PPE'],
        naturalRemedies: ['Timely sowing', 'Field sanitation', 'Encourage natural enemies']
      },
      diseases: {
        commonDiseases: ['Powdery mildew', 'Stripe rust'],
        symptoms: ['White powdery growth', 'Yellow/orange stripes'],
        treatment: ['Resistant varieties; fungicides per label if threshold crossed'],
        prevention: ['Balanced nutrition', 'Avoid late sowing']
      },
      harvesting: {
        indicators: ['Yellowing of spikes', 'Grains hard', 'Moisture ~18–20%'],
        method: 'Cutting and threshing',
        storage: 'Dry to ~12% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'jowar',
    name: 'Jowar (Sorghum)',
    duration_days: [110, 120],
    ideal_temp: [26, 33],
    rainfall_need: [40, 100],
    soil_ok: ['black', 'sandy loam'],
    pH: [6.0, 8.0],
    irrigation_notes: 'Drought resistant, low water requirement',
    harvest_sensitivity: 'low',
    seasonality: ['kharif', 'rabi'],
    category: 'cereal',
    yield_potential: '15-25 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '8–12 kg/ha',
        spacing: '45 x 15 cm',
        depth: '3–4 cm',
        method: 'Line sowing',
        bestTime: 'Kharif: Jun–Jul; Rabi (irrigated): Sep–Oct'
      },
      irrigation: {
        frequency: '2–4 irrigations',
        amount: '250–350 mm',
        criticalStages: ['Panicle initiation', 'Flowering', 'Grain filling'],
        method: 'Furrow'
      },
      fertilization: {
        organic: ['5–10 t FYM/ha'],
        chemical: {
          nitrogen: '80 kg/ha',
          phosphorous: '40 kg/ha',
          potassium: '40 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at sowing', '1/2 N at 30–35 DAS']
      },
      pestManagement: {
        commonPests: ['Shoot fly', 'Stem borer', 'Aphids'],
        pesticides: ['Use locally registered options for sorghum; follow PPE'],
        naturalRemedies: ['Timely sowing', 'Neem-based sprays', 'Set up bird perches']
      },
      diseases: {
        commonDiseases: ['Anthracnose', 'Grain mold'],
        symptoms: ['Leaf spots/lesions', 'Moldy grains in humid weather'],
        treatment: ['Use tolerant varieties; apply fungicides as per label if severe'],
        prevention: ['Clean seed', 'Avoid lodging', 'Dry harvest']
      },
      harvesting: {
        indicators: ['Physiological maturity; panicles hard'],
        method: 'Cutting, drying, threshing',
        storage: 'Dry to ≤12% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'bajra',
    name: 'Bajra (Pearl Millet)',
    duration_days: [75, 100],
    ideal_temp: [25, 35],
    rainfall_need: [40, 75],
    soil_ok: ['sandy loam', 'black', 'alluvial'],
    pH: [6.5, 8.0],
    irrigation_notes: 'Highly drought tolerant, minimal irrigation',
    harvest_sensitivity: 'low',
    seasonality: ['kharif'],
    category: 'cereal',
    yield_potential: '10-20 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '3–5 kg/ha',
        spacing: '45 x 10–15 cm',
        depth: '2–3 cm',
        method: 'Line sowing',
        bestTime: 'Jun–Jul (monsoon onset)'
      },
      irrigation: {
        frequency: '1–3 irrigations (if dry spells)',
        amount: '200–300 mm',
        criticalStages: ['Tillering', 'Booting', 'Flowering'],
        method: 'Furrow'
      },
      fertilization: {
        organic: ['3–5 t FYM/ha'],
        chemical: {
          nitrogen: '60 kg/ha',
          phosphorous: '30 kg/ha',
          potassium: '30 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at sowing', '1/2 N at 25–30 DAS']
      },
      pestManagement: {
        commonPests: ['Shoot fly', 'Stem borer'],
        pesticides: ['Use locally registered options for pearl millet; follow PPE'],
        naturalRemedies: ['Early sowing', 'Trap crops', 'Neem-based sprays']
      },
      diseases: {
        commonDiseases: ['Downy mildew', 'Ergot'],
        symptoms: ['Downy growth/chlorosis', 'Honeydew on panicles'],
        treatment: ['Seed treatment; fungicides per label if needed'],
        prevention: ['Resistant hybrids', 'Crop rotation']
      },
      harvesting: {
        indicators: ['Earheads dry and hard', 'Grains hard'],
        method: 'Cutting and drying',
        storage: 'Dry to ~12% moisture',
        processing: 'Threshing, cleaning'
      }
    }
  },
  {
    id: 'ragi',
    name: 'Ragi (Finger Millet)',
    duration_days: [100, 120],
    ideal_temp: [20, 30],
    rainfall_need: [70, 100],
    soil_ok: ['red loam', 'lateritic'],
    pH: [5.0, 7.0],
    irrigation_notes: 'Moderate water needs, can handle dry spells',
    harvest_sensitivity: 'low',
    seasonality: ['kharif'],
    category: 'cereal',
    yield_potential: '15-25 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '5–7 kg/ha (direct); 0.6–1 kg/ha (nursery for transplant)',
        spacing: '30 x 10 cm (transplant) / 22.5 cm rows (direct)',
        depth: '2–3 cm',
        method: 'Direct seeding or transplanting',
        bestTime: 'Jun–Jul (rainfed); Aug–Sep (late/irrigated)'
      },
      irrigation: {
        frequency: '3–5 irrigations',
        amount: '300–400 mm',
        criticalStages: ['Tillering', 'Panicle initiation', 'Flowering'],
        method: 'Furrow/sprinkler'
      },
      fertilization: {
        organic: ['5–10 t FYM/ha'],
        chemical: {
          nitrogen: '60 kg/ha',
          phosphorous: '30 kg/ha',
          potassium: '30 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at sowing', '1/2 N at 30–35 DAS']
      },
      pestManagement: {
        commonPests: ['Cutworm', 'Stem borer'],
        pesticides: ['Use locally registered options for finger millet; follow PPE'],
        naturalRemedies: ['Weed control early', 'Neem-based sprays', 'Bird perches']
      },
      diseases: {
        commonDiseases: ['Blast'],
        symptoms: ['Leaf/neck lesions; chaffy grains'],
        treatment: ['Resistant varieties; fungicide per label if severe'],
        prevention: ['Balanced nutrition', 'Avoid excess N']
      },
      harvesting: {
        indicators: ['Panicles turn brown', 'Seeds hard'],
        method: 'Cutting and drying; thresh by beating',
        storage: 'Dry grain to ≤12%',
        processing: 'Cleaning, grading'
      }
    }
  },

  // NEW CROPS - Pulses
  {
    id: 'moong',
    name: 'Green Gram (Moong)',
    duration_days: [65, 80],
    ideal_temp: [25, 35],
    rainfall_need: [30, 90],
    soil_ok: ['alluvial', 'sandy loam'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Low water requirement, drought tolerant',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'summer'],
    category: 'pulse',
    yield_potential: '8-12 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '12–15 kg/ha',
        spacing: '30 x 10 cm',
        depth: '3–4 cm',
        method: 'Line sowing',
        bestTime: 'Kharif: Jun–Jul; Summer: Mar–Apr (irrigated)'
      },
      irrigation: {
        frequency: '2–3 irrigations (avoid waterlogging)',
        amount: '150–250 mm',
        criticalStages: ['Flowering', 'Pod formation'],
        method: 'Furrow/drip'
      },
      fertilization: {
        organic: ['2–3 t FYM/ha'],
        chemical: {
          nitrogen: '20 kg/ha',
          phosphorous: '40 kg/ha',
          potassium: '20 kg/ha'
        },
        schedule: ['Basal all; Rhizobium + PSB seed inoculation advised']
      },
      pestManagement: {
        commonPests: ['Whitefly/Thrips', 'Pod borer', 'Aphids'],
        pesticides: ['Use locally registered options for moong; follow PPE'],
        naturalRemedies: ['Neem seed kernel extract', 'Pheromone traps', 'Early sowing']
      },
      diseases: {
        commonDiseases: ['YMV', 'Cercospora leaf spot'],
        symptoms: ['Yellow mosaic patches', 'Circular leaf spots'],
        treatment: ['Rogue infected plants; vector control as per label'],
        prevention: ['Resistant varieties', 'Seed treatment']
      },
      harvesting: {
        indicators: ['80–85% pods mature and turn black/brown'],
        method: 'Pickings in 2–3 rounds to avoid shattering',
        storage: 'Dry to ≤9–10% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'urad',
    name: 'Black Gram (Urad)',
    duration_days: [70, 90],
    ideal_temp: [25, 35],
    rainfall_need: [40, 80],
    soil_ok: ['loam', 'black', 'alluvial'],
    pH: [6.5, 7.5],
    irrigation_notes: 'Moderate water needs, sensitive to waterlogging',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'rabi'],
    category: 'pulse',
    yield_potential: '6-10 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '12–18 kg/ha',
        spacing: '30–45 x 10 cm',
        depth: '3–4 cm',
        method: 'Line sowing',
        bestTime: 'Kharif: Jun–Jul; Rabi (irrigated): Oct–Nov'
      },
      irrigation: {
        frequency: '2–3 irrigations',
        amount: '150–250 mm',
        criticalStages: ['Flowering', 'Pod filling'],
        method: 'Furrow/drip'
      },
      fertilization: {
        organic: ['2–3 t FYM/ha'],
        chemical: {
          nitrogen: '20 kg/ha',
          phosphorous: '40 kg/ha',
          potassium: '20 kg/ha'
        },
        schedule: ['Basal all; Rhizobium inoculation recommended']
      },
      pestManagement: {
        commonPests: ['Whitefly', 'Pod borer', 'Aphids'],
        pesticides: ['Use locally registered options for urad; follow PPE'],
        naturalRemedies: ['NSKE', 'Light traps', 'Timely sowing']
      },
      diseases: {
        commonDiseases: ['YMV', 'Leaf spots'],
        symptoms: ['Yellow mosaic patches', 'Brown/circular spots'],
        treatment: ['Vector management; fungicides per label'],
        prevention: ['Resistant varieties', 'Seed treatment', 'Rogueing']
      },
      harvesting: {
        indicators: ['Pods turn black and dry; seeds hard'],
        method: 'Cut plants and dry; thresh',
        storage: 'Dry to ≤9–10%',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'masoor',
    name: 'Lentil (Masoor)',
    duration_days: [100, 110],
    ideal_temp: [18, 25],
    rainfall_need: [30, 50],
    soil_ok: ['sandy loam', 'alluvial', 'clay loam'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Low water requirement, cool season crop',
    harvest_sensitivity: 'medium',
    seasonality: ['rabi'],
    category: 'pulse',
    yield_potential: '8-15 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '30–40 kg/ha',
        spacing: '30 x 10 cm',
        depth: '3–4 cm',
        method: 'Line sowing',
        bestTime: 'Nov (cool season)'
      },
      irrigation: {
        frequency: '1–2 irrigations',
        amount: '120–180 mm',
        criticalStages: ['Flowering', 'Pod filling'],
        method: 'Light irrigation; avoid waterlogging'
      },
      fertilization: {
        organic: ['2–3 t FYM/ha'],
        chemical: {
          nitrogen: '20 kg/ha',
          phosphorous: '40 kg/ha',
          potassium: '20 kg/ha'
        },
        schedule: ['Basal all; Rhizobium inoculation recommended']
      },
      pestManagement: {
        commonPests: ['Aphids', 'Cutworm'],
        pesticides: ['Use locally registered options for lentil; follow PPE'],
        naturalRemedies: ['Sticky traps', 'Neem-based sprays', 'Early sowing']
      },
      diseases: {
        commonDiseases: ['Rust', 'Wilt'],
        symptoms: ['Rust pustules', 'Sudden wilt/yellowing'],
        treatment: ['Resistant varieties; fungicides per label if severe'],
        prevention: ['Crop rotation', 'Clean seed']
      },
      harvesting: {
        indicators: ['Pods turn brown; seeds hard'],
        method: 'Cutting and drying; thresh',
        storage: 'Dry to ≤10–11%',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'chana',
    name: 'Chickpea (Chana)',
    duration_days: [100, 120],
    ideal_temp: [20, 27],
    rainfall_need: [40, 60],
    soil_ok: ['loam', 'black', 'alluvial'],
    pH: [6.2, 7.8],
    irrigation_notes: 'Moderate water needs, frost sensitive',
    harvest_sensitivity: 'medium',
    seasonality: ['rabi'],
    category: 'pulse',
    yield_potential: '12-20 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '60–80 kg/ha (desi) / 80–100 kg/ha (kabuli)',
        spacing: '30–45 x 10 cm',
        depth: '5–8 cm',
        method: 'Line sowing',
        bestTime: 'Oct–Nov (after monsoon withdrawal)'
      },
      irrigation: {
        frequency: '2–3 irrigations (if needed)',
        amount: '150–250 mm',
        criticalStages: ['Branching', 'Flowering', 'Pod filling'],
        method: 'Furrow; avoid standing water'
      },
      fertilization: {
        organic: ['3–5 t FYM/ha'],
        chemical: {
          nitrogen: '20 kg/ha',
          phosphorous: '40–60 kg/ha',
          potassium: '0–20 kg/ha (as per soil test)'
        },
        schedule: ['Basal all; Rhizobium inoculation strongly advised']
      },
      pestManagement: {
        commonPests: ['Pod borer (Helicoverpa)', 'Aphids'],
        pesticides: ['Use locally registered options for chickpea; follow PPE'],
        naturalRemedies: ['Pheromone traps', 'Neem-based sprays', 'Marigold trap crops']
      },
      diseases: {
        commonDiseases: ['Fusarium wilt', 'Ascochyta blight'],
        symptoms: ['Sudden wilting', 'Spots on leaves/pods'],
        treatment: ['Resistant cultivars; fungicides per label if threshold'],
        prevention: ['Rotation (2–3 yrs)', 'Seed treatment']
      },
      harvesting: {
        indicators: ['Pods turn straw-colored; seeds firm'],
        method: 'Cutting, field drying, threshing',
        storage: 'Dry to ≤10%',
        processing: 'Cleaning, grading'
      }
    }
  },

  // NEW CROPS - Oilseeds
  {
    id: 'groundnut',
    name: 'Groundnut',
    duration_days: [100, 120],
    ideal_temp: [25, 30],
    rainfall_need: [50, 75],
    soil_ok: ['sandy loam', 'red', 'black'],
    pH: [6.0, 7.0],
    irrigation_notes: 'Moderate water, well-drained soil essential',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'summer'],
    category: 'oilseed',
    yield_potential: '20-30 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '120–150 kg pods/ha (Spanish); 80–100 kg/ha (Virginia)',
        spacing: '30–45 x 10–15 cm',
        depth: '5–6 cm',
        method: 'Line sowing/dibbling',
        bestTime: 'Kharif: Jun; Summer: Jan–Feb (irrigated)'
      },
      irrigation: {
        frequency: '4–6 irrigations',
        amount: '300–400 mm',
        criticalStages: ['Flowering', 'Pegging', 'Pod filling'],
        method: 'Furrow/drip; avoid waterlogging'
      },
      fertilization: {
        organic: ['2–3 t FYM/ha'],
        chemical: {
          nitrogen: '20 kg/ha',
          phosphorous: '40 kg/ha',
          potassium: '40 kg/ha'
        },
        schedule: ['Basal all; apply gypsum (Ca) at pegging if soils deficient']
      },
      pestManagement: {
        commonPests: ['Leaf miner', 'Thrips', 'Aphids'],
        pesticides: ['Use locally registered options for groundnut; follow PPE'],
        naturalRemedies: ['NSKE', 'Light traps', 'Timely weeding']
      },
      diseases: {
        commonDiseases: ['Late leaf spot', 'Rust'],
        symptoms: ['Brown/black spots; pustules', 'Defoliation in severe cases'],
        treatment: ['Fungicides per label if disease progresses'],
        prevention: ['Crop rotation', 'Balanced nutrition', 'Seed treatment']
      },
      harvesting: {
        indicators: ['70–75% pods mature; shells hard; kernels plump'],
        method: 'Uproot, field-dry, strip pods',
        storage: 'Dry kernels to ≤8% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'mustard',
    name: 'Mustard',
    duration_days: [90, 120],
    ideal_temp: [10, 25],
    rainfall_need: [25, 40],
    soil_ok: ['alluvial', 'loam'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Low water requirement, cool season crop',
    harvest_sensitivity: 'low',
    seasonality: ['rabi'],
    category: 'oilseed',
    yield_potential: '12-18 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '4–6 kg/ha',
        spacing: '30–45 x 10–15 cm',
        depth: '2–3 cm',
        method: 'Line sowing',
        bestTime: 'Oct–Nov'
      },
      irrigation: {
        frequency: '2–3 irrigations',
        amount: '120–180 mm',
        criticalStages: ['Branching', 'Flowering', 'Pod filling'],
        method: 'Furrow'
      },
      fertilization: {
        organic: ['3–5 t FYM/ha'],
        chemical: {
          nitrogen: '80 kg/ha',
          phosphorous: '40 kg/ha',
          potassium: '40 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at sowing', '1/2 N at flowering']
      },
      pestManagement: {
        commonPests: ['Aphids', 'Sawfly'],
        pesticides: ['Use locally registered options for mustard; follow PPE'],
        naturalRemedies: ['Yellow sticky traps', 'Neem-based sprays', 'Border cropping']
      },
      diseases: {
        commonDiseases: ['Alternaria blight', 'White rust'],
        symptoms: ['Leaf/pod blight spots', 'White pustules/deformation'],
        treatment: ['Apply fungicides per label if needed'],
        prevention: ['Timely sowing', 'Resistant varieties', 'Clean seed']
      },
      harvesting: {
        indicators: ['Pods turn yellow-brown; seeds hard'],
        method: 'Cutting and drying; thresh',
        storage: 'Dry to ≤8% seed moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'soybean',
    name: 'Soybean',
    duration_days: [90, 110],
    ideal_temp: [20, 30],
    rainfall_need: [60, 100],
    soil_ok: ['black', 'loam'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Moderate water needs, well-distributed rainfall',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif'],
    category: 'oilseed',
    yield_potential: '15-25 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '60–75 kg/ha',
        spacing: '45 x 5–7 cm (narrow rows) or 30 x 10 cm',
        depth: '3–4 cm',
        method: 'Line sowing',
        bestTime: 'Jun–Jul (monsoon onset)'
      },
      irrigation: {
        frequency: '3–5 irrigations (if dry spells)',
        amount: '300–400 mm',
        criticalStages: ['Flowering', 'Pod set', 'Seed filling'],
        method: 'Furrow/drip'
      },
      fertilization: {
        organic: ['3–5 t FYM/ha'],
        chemical: {
          nitrogen: '20 kg/ha',
          phosphorous: '60 kg/ha',
          potassium: '40 kg/ha'
        },
        schedule: ['Basal all; Rhizobium + PSB inoculation recommended']
      },
      pestManagement: {
        commonPests: ['Girdle beetle', 'Defoliators', 'Stem fly'],
        pesticides: ['Use locally registered options for soybean; follow PPE'],
        naturalRemedies: ['Pheromone/light traps', 'Neem-based sprays', 'Timely sowing']
      },
      diseases: {
        commonDiseases: ['Rust', 'Collar rot', 'Bacterial pustule'],
        symptoms: ['Rust pustules', 'Collar browning/wilt', 'Leaf spots'],
        treatment: ['Apply fungicides per label if needed; sanitation'],
        prevention: ['Resistant varieties', 'Crop rotation', 'Seed treatment']
      },
      harvesting: {
        indicators: ['85% pods brown; leaves shed'],
        method: 'Cut, field-dry, thresh',
        storage: 'Dry to ≤9–10% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    duration_days: [80, 120],
    ideal_temp: [20, 30],
    rainfall_need: [50, 75],
    soil_ok: ['loam', 'sandy loam', 'alluvial'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Moderate water, drought tolerant after establishment',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'rabi'],
    category: 'oilseed',
    yield_potential: '12-20 quintals/hectare',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: '3–5 kg/ha',
        spacing: '60 x 30 cm',
        depth: '3–5 cm',
        method: 'Dibbling',
        bestTime: 'Kharif: Jun–Jul; Rabi (irrigated): Oct–Nov'
      },
      irrigation: {
        frequency: '4–6 irrigations',
        amount: '300–400 mm',
        criticalStages: ['Bud initiation', 'Flowering', 'Grain filling'],
        method: 'Furrow/drip'
      },
      fertilization: {
        organic: ['3–5 t FYM/ha'],
        chemical: {
          nitrogen: '60 kg/ha',
          phosphorous: '90 kg/ha',
          potassium: '60 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at sowing', '1/2 N at 30–35 DAS']
      },
      pestManagement: {
        commonPests: ['Head borer', 'Helicoverpa', 'Aphids'],
        pesticides: ['Use locally registered options for sunflower; follow PPE'],
        naturalRemedies: ['Pheromone traps', 'Neem-based sprays', 'Bird perches']
      },
      diseases: {
        commonDiseases: ['Alternaria blight', 'Downy mildew'],
        symptoms: ['Leaf/petal spots', 'Downy growth & stunting'],
        treatment: ['Fungicides per label if needed'],
        prevention: ['Clean seed', 'Timely sowing']
      },
      harvesting: {
        indicators: ['Back of head turns yellow-brown; seeds hard'],
        method: 'Cut heads, dry, thresh',
        storage: 'Dry seed to ≤8–9% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },
  {
    id: 'sesame',
    name: 'Sesame (Til)',
    duration_days: [80, 100],
    ideal_temp: [25, 35],
    rainfall_need: [40, 70],
    soil_ok: ['sandy loam', 'alluvial'],
    pH: [5.5, 7.5],
    irrigation_notes: 'Low water requirement, drought tolerant',
    harvest_sensitivity: 'high',
    seasonality: ['kharif', 'summer'],
    category: 'oilseed',
    yield_potential: '4-8 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '3–5 kg/ha',
        spacing: '30–45 x 10–15 cm',
        depth: '1.5–2.5 cm',
        method: 'Line sowing',
        bestTime: 'Jun–Jul (kharif); Mar–Apr (summer, irrigated)'
      },
      irrigation: {
        frequency: '1–3 irrigations (avoid excess)',
        amount: '120–200 mm',
        criticalStages: ['Flowering', 'Capsule set'],
        method: 'Furrow'
      },
      fertilization: {
        organic: ['2–3 t FYM/ha'],
        chemical: {
          nitrogen: '40 kg/ha',
          phosphorous: '20 kg/ha',
          potassium: '20 kg/ha'
        },
        schedule: ['Basal all; avoid heavy N']
      },
      pestManagement: {
        commonPests: ['Leaf roller', 'Capsule borer', 'Jassids'],
        pesticides: ['Use locally registered options for sesame; follow PPE'],
        naturalRemedies: ['NSKE', 'Pheromone traps', 'Timely sowing']
      },
      diseases: {
        commonDiseases: ['Phyllody', 'Wilt'],
        symptoms: ['Witch’s broom symptoms', 'Sudden wilt/yellowing'],
        treatment: ['Rogue infected plants; vector management'],
        prevention: ['Clean seed', 'Crop rotation']
      },
      harvesting: {
        indicators: ['Capsules turn yellow; lower capsules start drying'],
        method: 'Cut plants and stack for drying; thresh carefully (shattering risk)',
        storage: 'Dry seed to ≤7–8% moisture',
        processing: 'Cleaning, grading'
      }
    }
  },

  // NEW CROPS - Cash Crops & Plantation
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    duration_days: [300, 480],
    ideal_temp: [21, 27],
    rainfall_need: [75, 150],
    soil_ok: ['alluvial', 'loam', 'black'],
    pH: [6.0, 7.5],
    irrigation_notes: 'High water requirement, year-round irrigation',
    harvest_sensitivity: 'low',
    seasonality: ['annual'],
    category: 'cash',
    yield_potential: '600-800 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '3-budded setts ~6–8 t/ha',
        spacing: '90–120 cm rows',
        depth: 'Sett placed 5–8 cm deep',
        method: 'Furrow planting',
        bestTime: 'Spring: Feb–Mar; Adsali/Autumn: Jul–Oct (state-dependent)'
      },
      irrigation: {
        frequency: '10–20 irrigations (depends on climate)',
        amount: '1500–2500 mm',
        criticalStages: ['Tillering', 'Grand growth', 'Maturity'],
        method: 'Furrow/drip; mulch recommended'
      },
      fertilization: {
        organic: ['10–15 t FYM/ha; trash mulching'],
        chemical: {
          nitrogen: '150–250 kg/ha',
          phosphorous: '60–100 kg/ha',
          potassium: '60–120 kg/ha'
        },
        schedule: ['Split N across tillering to grand growth; basal P&K']
      },
      pestManagement: {
        commonPests: ['Early shoot borer', 'Top borer', 'Pyrilla'],
        pesticides: ['Use locally registered options for sugarcane; follow PPE'],
        naturalRemedies: ['Trash mulching', 'Light traps', 'Conserve parasitoids']
      },
      diseases: {
        commonDiseases: ['Red rot', 'Smut', 'Ratoon stunting'],
        symptoms: ['Red streaks; foul smell', 'Whip-like growth', 'Stunting'],
        treatment: ['Resistant varieties; rogue infected stools'],
        prevention: ['Healthy seed setts; hot-water treatment; rotation']
      },
      harvesting: {
        indicators: ['Brix/juice maturity optimum; cane tops dry'],
        method: 'Manual cutting or mechanical harvester',
        storage: 'Crush soon after harvest (sucrose loss)',
        processing: 'Transport to mill promptly'
      }
    }
  },
  {
    id: 'tea',
    name: 'Tea',
    duration_days: [0, 0], // perennial
    ideal_temp: [18, 30],
    rainfall_need: [150, 300],
    soil_ok: ['acidic loam'],
    pH: [4.5, 6.0],
    irrigation_notes: 'High rainfall, well-drained slopes',
    harvest_sensitivity: 'high',
    seasonality: ['perennial'],
    category: 'plantation',
    yield_potential: '1500-2500 kg/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: 'Nursery-raised plants; 10–12 month old',
        spacing: '1.2 x 0.75 m (region-specific)',
        depth: 'Plant at collar level',
        method: 'Pit planting on contours',
        bestTime: 'Monsoon onset (Jun–Aug)'
      },
      irrigation: {
        frequency: 'As per rainfall; supplemental in dry spells',
        amount: '1200–2500 mm (rainfall dominated)',
        criticalStages: ['Flush periods', 'Dry spells'],
        method: 'Sprinkler/drip on slopes; mulch'
      },
      fertilization: {
        organic: ['Mulch with prunings; compost; green manures'],
        chemical: {
          nitrogen: 'Split N based on plucking rounds',
          phosphorous: 'Low to moderate (soil test based)',
          potassium: 'Moderate to high (soil test based)'
        },
        schedule: ['Multiple small splits aligned to flush cycles; soil test-based']
      },
      pestManagement: {
        commonPests: ['Tea mosquito bug', 'Red spider mite', 'Looper caterpillars'],
        pesticides: ['Use locally registered options for tea; observe residue limits'],
        naturalRemedies: ['Shade management', 'Pruning sanitation', 'Conserve predators']
      },
      diseases: {
        commonDiseases: ['Blister blight', 'Root diseases'],
        symptoms: ['Leaf blister lesions', 'Yellowing, wilting'],
        treatment: ['Fungicides per label; pruning sanitation'],
        prevention: ['Well-drained soils', 'Balanced shade and nutrition']
      },
      harvesting: {
        indicators: ['Two leaves and a bud (plucking standard)'],
        method: 'Manual plucking',
        storage: 'Process same day (withering)',
        processing: 'Wither, roll, oxidize (as type), dry'
      }
    }
  },
  {
    id: 'coffee',
    name: 'Coffee',
    duration_days: [0, 0], // perennial
    ideal_temp: [15, 28],
    rainfall_need: [150, 250],
    soil_ok: ['red loam', 'lateritic'],
    pH: [6.0, 7.0],
    irrigation_notes: 'Well-distributed rainfall, shade required',
    harvest_sensitivity: 'high',
    seasonality: ['perennial'],
    category: 'plantation',
    yield_potential: '500-800 kg/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: 'Nursery seedlings; shade trees established',
        spacing: '2 x 2 m (arabica) / 3 x 3 m (robusta)',
        depth: 'Plant at collar level',
        method: 'Pit planting with shade',
        bestTime: 'Monsoon onset or post-monsoon with irrigation'
      },
      irrigation: {
        frequency: 'Blossom and backing irrigations (arabica)',
        amount: 'Rainfall-based; supplemental 2–4 irrigations',
        criticalStages: ['Blossom', 'Berry set'],
        method: 'Basin irrigation; mulch'
      },
      fertilization: {
        organic: ['Compost, shade litter, mulch'],
        chemical: {
          nitrogen: 'Split N as per yield class',
          phosphorous: 'Soil test based',
          potassium: 'Soil test based'
        },
        schedule: ['2–4 splits across growth/berry development']
      },
      pestManagement: {
        commonPests: ['White stem borer (arabica)', 'Berry borer', 'Mealybugs'],
        pesticides: ['Use locally registered options; bark scrapping/trapping for stem borer'],
        naturalRemedies: ['Shade regulation', 'Sanitation harvest', 'Alcohol traps for berry borer']
      },
      diseases: {
        commonDiseases: ['Coffee leaf rust', 'Black rot'],
        symptoms: ['Orange rust pustules', 'Blackening of leaves/berries'],
        treatment: ['Fungicides per label; sanitation'],
        prevention: ['Resistant varieties', 'Good air flow']
      },
      harvesting: {
        indicators: ['Berries turn red (cherry)'],
        method: 'Selective picking',
        storage: 'Process promptly (wet/dry)',
        processing: 'Pulping, fermentation/washing (wet) or sun-drying (dry)'
      }
    }
  },
  {
    id: 'coconut',
    name: 'Coconut',
    duration_days: [0, 0], // perennial
    ideal_temp: [20, 32],
    rainfall_need: [100, 300],
    soil_ok: ['sandy loam', 'alluvial'],
    pH: [5.2, 8.0],
    irrigation_notes: 'High water tolerance, coastal conditions',
    harvest_sensitivity: 'low',
    seasonality: ['perennial'],
    category: 'plantation',
    yield_potential: '80-150 nuts/palm/year',
    profit_potential: 'medium',
    guide: {
      planting: {
        seedRate: 'Seedlings from quality nurseries',
        spacing: '7.5 x 7.5 m (square)',
        depth: 'Plant at collar level in pits',
        method: 'Pit planting with basin',
        bestTime: 'Onset of monsoon or irrigated season'
      },
      irrigation: {
        frequency: 'Monthly to fortnightly (climate dependent)',
        amount: '60–100 L/palm/irrigation (drip preferred)',
        criticalStages: ['Flowering', 'Nut setting/summer months'],
        method: 'Basin/drip with mulching'
      },
      fertilization: {
        organic: ['Mulch with husk, FYM/compost in basins'],
        chemical: {
          nitrogen: '0.5–1.0 kg N/palm/year',
          phosphorous: '0.3–0.5 kg P₂O₅/palm/year',
          potassium: '1.0–1.5 kg K₂O/palm/year'
        },
        schedule: ['2–3 splits/year; apply in basin with irrigation']
      },
      pestManagement: {
        commonPests: ['Rhinoceros beetle', 'Red palm weevil', 'Black-headed caterpillar'],
        pesticides: ['Use locally registered options; pheromone traps for weevil'],
        naturalRemedies: ['Clean crowns', 'Biological agents (Oryctes rhinoceros nudivirus)', 'Light traps']
      },
      diseases: {
        commonDiseases: ['Bud rot', 'Stem bleeding'],
        symptoms: ['Rotting central shoot', 'Gum oozing'],
        treatment: ['Sanitation, fungicides per label'],
        prevention: ['Good drainage', 'Avoid crown injury']
      },
      harvesting: {
        indicators: ['Tender nuts by 7–8 months; mature at 11–12 months'],
        method: 'Climb and harvest at intervals',
        storage: 'Shade store; ventilated area',
        processing: 'Dehusking, copra making/oil extraction'
      }
    }
  },
  {
    id: 'banana',
    name: 'Banana',
    duration_days: [300, 365],
    ideal_temp: [21, 30],
    rainfall_need: [100, 200],
    soil_ok: ['alluvial', 'loam', 'volcanic'],
    pH: [6.0, 7.5],
    irrigation_notes: 'High water requirement, consistent moisture',
    harvest_sensitivity: 'high',
    seasonality: ['annual'],
    category: 'fruit',
    yield_potential: '400-600 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: 'Tissue culture plants/suckers',
        spacing: '1.8 x 1.5 m (variety dependent)',
        depth: 'Plant at collar level',
        method: 'Pit/trench planting',
        bestTime: 'Monsoon onset or irrigated season'
      },
      irrigation: {
        frequency: 'Weekly (more in summer)',
        amount: '1500–2000 mm equivalent',
        criticalStages: ['Vegetative growth', 'Bunch initiation', 'Fruit filling'],
        method: 'Drip with mulching preferred'
      },
      fertilization: {
        organic: ['10–20 kg FYM/plant at planting'],
        chemical: {
          nitrogen: '200–300 g N/plant/month (split)',
          phosphorous: '100–150 g P₂O₅/plant (split)',
          potassium: '200–300 g K₂O/plant/month (split)'
        },
        schedule: ['Monthly splits; adjust by variety and soil test']
      },
      pestManagement: {
        commonPests: ['Banana weevil', 'Pseudostem borer', 'Aphids'],
        pesticides: ['Use locally registered options for banana; follow PPE'],
        naturalRemedies: ['Trap logs for weevil', 'Sanitation', 'Neem cake in pits']
      },
      diseases: {
        commonDiseases: ['Sigatoka leaf spot', 'Panama wilt'],
        symptoms: ['Leaf streaks/necrosis', 'Vascular wilt'],
        treatment: ['Fungicides per label; rogue infected stools'],
        prevention: ['Tissue culture plants', 'Drainage', 'Field sanitation']
      },
      harvesting: {
        indicators: ['Bunch maturity by fullness of fingers; 11–12 months after planting'],
        method: 'Dehanding with padding',
        storage: 'Cool, ventilated; ripen under control if needed',
        processing: 'Grading, packing, ripening'
      }
    }
  },

  // Additional vegetables
  {
    id: 'tomato',
    name: 'Tomato',
    duration_days: [70, 120],
    ideal_temp: [18, 27],
    rainfall_need: [60, 150],
    soil_ok: ['loam', 'sandy loam'],
    pH: [6.0, 7.0],
    irrigation_notes: 'Regular irrigation, avoid waterlogging',
    harvest_sensitivity: 'high',
    seasonality: ['kharif', 'rabi'],
    category: 'vegetable',
    yield_potential: '200-400 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '100–150 g seed/ha (nursery); transplant 25–30 day seedlings',
        spacing: '60 x 45 cm (stakes/trellis as needed)',
        depth: 'Transplant at collar level',
        method: 'Transplanting',
        bestTime: 'Kharif: Jun–Jul; Rabi: Oct–Nov (region-specific)'
      },
      irrigation: {
        frequency: '2–3 times/week (season dependent)',
        amount: '400–600 mm',
        criticalStages: ['Flowering', 'Fruit set', 'Fruit filling'],
        method: 'Drip preferred; mulch to reduce blight'
      },
      fertilization: {
        organic: ['10–15 t FYM/ha; mulch/compost'],
        chemical: {
          nitrogen: '100–150 kg/ha',
          phosphorous: '50–60 kg/ha',
          potassium: '50–80 kg/ha'
        },
        schedule: ['Basal 50% NPK; remaining N&K via fertigation splits']
      },
      pestManagement: {
        commonPests: ['Fruit borer', 'Whitefly', 'Thrips'],
        pesticides: ['Use locally registered options for tomato; follow MRLs'],
        naturalRemedies: ['Pheromone traps', 'Yellow/blue sticky traps', 'Neem-based sprays']
      },
      diseases: {
        commonDiseases: ['Late blight', 'Early blight', 'TYLCV (viral)'],
        symptoms: ['Leaf blight lesions', 'Concentric rings', 'Leaf curl/yellowing'],
        treatment: ['Fungicides per label; vector management for viruses'],
        prevention: ['Staking/trellis', 'Mulch to reduce splash', 'Resistant hybrids']
      },
      harvesting: {
        indicators: ['Breaker stage (for transport)', 'Pink/red for local markets'],
        method: 'Hand harvest in multiple pickings',
        storage: 'Cool, ventilated; avoid wetness',
        processing: 'Grading, packing'
      }
    }
  },
  {
    id: 'onion',
    name: 'Onion',
    duration_days: [120, 150],
    ideal_temp: [15, 25],
    rainfall_need: [65, 100],
    soil_ok: ['alluvial', 'sandy loam'],
    pH: [6.0, 7.5],
    irrigation_notes: 'Regular light irrigation, stop before harvest',
    harvest_sensitivity: 'medium',
    seasonality: ['kharif', 'rabi'],
    category: 'vegetable',
    yield_potential: '150-300 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '4–5 kg/ha (nursery) for transplant',
        spacing: '15 x 10 cm',
        depth: 'Transplant shallow at collar level',
        method: 'Transplanting (or sets)',
        bestTime: 'Kharif: Aug–Sep; Rabi: Dec–Jan (region)'
      },
      irrigation: {
        frequency: 'Light frequent irrigations; stop 10–15 days before harvest',
        amount: '350–500 mm',
        criticalStages: ['Bulb initiation', 'Bulb development'],
        method: 'Furrow/drip'
      },
      fertilization: {
        organic: ['10–15 t FYM/ha'],
        chemical: {
          nitrogen: '100–120 kg/ha',
          phosphorous: '50–60 kg/ha',
          potassium: '50–80 kg/ha'
        },
        schedule: ['Basal 50% NPK; split remaining N in 2–3 doses']
      },
      pestManagement: {
        commonPests: ['Thrips', 'Cutworm'],
        pesticides: ['Use locally registered options for onion; follow PPE'],
        naturalRemedies: ['Blue sticky traps', 'Mulch, irrigation management']
      },
      diseases: {
        commonDiseases: ['Purple blotch', 'Downy mildew'],
        symptoms: ['Purple lesions with yellow halo', 'Downy growth on leaves'],
        treatment: ['Fungicides per label'],
        prevention: ['Wide spacing/airflow', 'Avoid overhead irrigation']
      },
      harvesting: {
        indicators: ['Neck fall of 50–80% plants', 'Bulbs well-formed'],
        method: 'Uproot, field-cure for 10–14 days',
        storage: 'Dry bulbs to <8% neck moisture; ventilated storage',
        processing: 'Grading, packing'
      }
    }
  },
  {
    id: 'potato',
    name: 'Potato',
    duration_days: [90, 120],
    ideal_temp: [15, 25],
    rainfall_need: [50, 100],
    soil_ok: ['sandy loam', 'loam'],
    pH: [5.2, 6.4],
    irrigation_notes: 'Regular irrigation, well-drained soil',
    harvest_sensitivity: 'medium',
    seasonality: ['rabi'],
    category: 'vegetable',
    yield_potential: '200-350 quintals/hectare',
    profit_potential: 'high',
    guide: {
      planting: {
        seedRate: '2.0–2.5 t/ha seed tubers (30–40 g each)',
        spacing: '60 x 20 cm (ridges & furrows)',
        depth: 'Plant 5–7 cm deep; earthing-up later',
        method: 'Seed tubers on ridges',
        bestTime: 'Oct–Nov (cool season)'
      },
      irrigation: {
        frequency: '6–8 irrigations',
        amount: '350–500 mm',
        criticalStages: ['Tuber initiation', 'Tuber bulking'],
        method: 'Furrow/drip; avoid waterlogging'
      },
      fertilization: {
        organic: ['10–15 t FYM/ha'],
        chemical: {
          nitrogen: '120 kg/ha',
          phosphorous: '60 kg/ha',
          potassium: '100 kg/ha'
        },
        schedule: ['Basal P&K + 1/2 N at planting', '1/2 N at earthing-up']
      },
      pestManagement: {
        commonPests: ['Cutworm', 'Aphids', 'Tuber moth (storage)'],
        pesticides: ['Use locally registered options for potato; follow PPE'],
        naturalRemedies: ['Proper earthing-up', 'Field sanitation', 'Light traps']
      },
      diseases: {
        commonDiseases: ['Late blight', 'Early blight', 'Black scurf'],
        symptoms: ['Leaf blight; tuber rot', 'Target spots', 'Sclerotia on tubers'],
        treatment: ['Fungicides per label; sanitation'],
        prevention: ['Healthy seed tubers', 'Crop rotation', 'Proper storage']
      },
      harvesting: {
        indicators: ['Haulm dry; tuber skin set'],
        method: 'Lifting and curing',
        storage: 'Store at 4°C (seed) or cool ventilated for table',
        processing: 'Grading, packing'
      }
    }
  }
];

export const getCropsByCategory = (category: Crop['category']) => {
  return crops.filter(crop => crop.category === category);
};

export const getCropById = (id: string) => {
  return crops.find(crop => crop.id === id);
};

export const searchCrops = (query: string) => {
  return crops.filter(crop => 
    crop.name.toLowerCase().includes(query.toLowerCase())
  );
};
