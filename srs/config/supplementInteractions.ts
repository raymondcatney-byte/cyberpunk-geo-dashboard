/**
 * Supplement & Drug Interaction Database
 * Lite version - JSON-based interactions (no Neo4j needed)
 * 
 * Sources: Examine.com, FDA, clinical guidelines
 * Future: Replace with Neo4j knowledge graph for complex interactions
 */

export interface Interaction {
  severity: 'critical' | 'high' | 'moderate' | 'low';
  mechanism: string;
  description: string;
  recommendation: string;
  sources: string[];
}

export interface SupplementData {
  name: string;
  category: 'supplement' | 'drug' | 'hormone' | 'peptide';
  commonNames: string[];
  mechanisms: string[];
  contraindications: string[];
  interactions: Record<string, Interaction>;
  notes?: string;
}

// Core interaction database
export const SUPPLEMENT_DATABASE: Record<string, SupplementData> = {
  // NMN
  nmn: {
    name: 'NMN (Nicotinamide Mononucleotide)',
    category: 'supplement',
    commonNames: ['NMN', 'Nicotinamide Mononucleotide', 'β-NMN'],
    mechanisms: ['NAD+ precursor', 'Sirtuin activation', 'Mitochondrial function'],
    contraindications: ['Pregnancy', 'Breastfeeding', 'Active cancer'],
    interactions: {
      metformin: {
        severity: 'moderate',
        mechanism: 'AMPK activation',
        description: 'Both activate AMPK pathway. May have synergistic effects on glucose metabolism.',
        recommendation: 'Generally compatible. Monitor blood glucose if diabetic.',
        sources: ['Examine.com', 'Cell Metabolism 2019']
      },
      resveratrol: {
        severity: 'low',
        mechanism: 'Sirtuin synergy',
        description: 'Synergistic activation of SIRT1. Combined use may enhance NAD+ benefits.',
        recommendation: 'Safe to combine. Popular longevity stack.',
        sources: ['Nature Communications 2021']
      },
      berberine: {
        severity: 'moderate',
        mechanism: 'AMPK overlap',
        description: 'Both affect AMPK and glucose metabolism.',
        recommendation: 'Monitor glucose levels. May enhance metformin-like effects.',
        sources: ['Journal of Ethnopharmacology']
      }
    }
  },

  // Metformin
  metformin: {
    name: 'Metformin',
    category: 'drug',
    commonNames: ['Metformin', 'Glucophage', 'Biguanide'],
    mechanisms: ['AMPK activation', 'Gluconeogenesis inhibition', 'Insulin sensitivity'],
    contraindications: ['Kidney disease (eGFR <30)', 'Lactic acidosis history', 'Severe liver disease'],
    interactions: {
      nmn: {
        severity: 'moderate',
        mechanism: 'AMPK activation',
        description: 'Both activate AMPK. May enhance glucose-lowering effects.',
        recommendation: 'Monitor blood glucose. Adjust metformin dose if needed.',
        sources: ['Diabetes Care 2020']
      },
      berberine: {
        severity: 'high',
        mechanism: 'Additive glucose lowering',
        description: 'Berberine has similar mechanism to metformin. Risk of hypoglycemia.',
        recommendation: 'Use caution. Consider berberine as metformin alternative, not additive.',
        sources: ['Metabolism 2015']
      },
      alcohol: {
        severity: 'high',
        mechanism: 'Lactic acidosis risk',
        description: 'Heavy alcohol use increases lactic acidosis risk with metformin.',
        recommendation: 'Avoid heavy alcohol consumption.',
        sources: ['FDA Label']
      }
    }
  },

  // Resveratrol
  resveratrol: {
    name: 'Resveratrol',
    category: 'supplement',
    commonNames: ['Resveratrol', 'Trans-resveratrol'],
    mechanisms: ['SIRT1 activation', 'AMPK activation', 'Anti-inflammatory'],
    contraindications: ['Surgery (2 weeks before)', 'Bleeding disorders'],
    interactions: {
      nmn: {
        severity: 'low',
        mechanism: 'Sirtuin synergy',
        description: 'Enhanced SIRT1 activation when combined with NAD+ precursors.',
        recommendation: 'Safe and synergistic combination.',
        sources: ['Nature Communications 2021']
      },
      blood_thinners: {
        severity: 'moderate',
        mechanism: 'Antiplatelet effects',
        description: 'May enhance anticoagulant effects.',
        recommendation: 'Monitor if on warfarin or other blood thinners.',
        sources: ['Journal of Medicinal Food']
      }
    }
  },

  // Berberine
  berberine: {
    name: 'Berberine',
    category: 'supplement',
    commonNames: ['Berberine', 'Berberis', 'Goldenseal'],
    mechanisms: ['AMPK activation', 'Glucose metabolism', 'Gut microbiome'],
    contraindications: ['Pregnancy', 'Breastfeeding', 'CYP enzyme interactions'],
    interactions: {
      metformin: {
        severity: 'high',
        mechanism: 'Additive effects',
        description: 'Similar mechanism to metformin. Risk of additive glucose lowering.',
        recommendation: 'Consider as alternative, not additive. Consult doctor.',
        sources: ['Metabolism 2015']
      },
      nmn: {
        severity: 'moderate',
        mechanism: 'AMPK overlap',
        description: 'Both activate AMPK pathway.',
        recommendation: 'Monitor glucose levels. May enhance effects.',
        sources: ['Journal of Ethnopharmacology']
      },
      cyp_substrates: {
        severity: 'moderate',
        mechanism: 'CYP3A4 inhibition',
        description: 'Inhibits CYP3A4, affecting many medications.',
        recommendation: 'Consult pharmacist for drug interactions.',
        sources: ['Drug Metabolism Reviews']
      }
    }
  },

  // Creatine
  creatine: {
    name: 'Creatine Monohydrate',
    category: 'supplement',
    commonNames: ['Creatine', 'Creatine Monohydrate'],
    mechanisms: ['ATP regeneration', 'Phosphocreatine system', 'Cellular hydration'],
    contraindications: ['Kidney disease (relative)', 'Bipolar disorder'],
    interactions: {
      caffeine: {
        severity: 'low',
        mechanism: 'Performance interaction',
        description: 'Caffeine may slightly reduce creatine uptake.',
        recommendation: 'Still effective together. Take creatine consistently.',
        sources: ['Journal of Applied Physiology']
      },
      diuretics: {
        severity: 'moderate',
        mechanism: 'Hydration status',
        description: 'Both affect water balance.',
        recommendation: 'Stay well hydrated. Monitor if on prescription diuretics.',
        sources: ['Examine.com']
      }
    }
  },

  // Omega-3
  omega3: {
    name: 'Omega-3 Fatty Acids',
    category: 'supplement',
    commonNames: ['Fish Oil', 'EPA', 'DHA', 'Omega-3', 'Krill Oil'],
    mechanisms: ['Anti-inflammatory', 'Cell membrane fluidity', 'Triglyceride reduction'],
    contraindications: ['Fish allergy', 'Surgery (high doses)', 'Bleeding disorders'],
    interactions: {
      blood_thinners: {
        severity: 'moderate',
        mechanism: 'Anticoagulant effects',
        description: 'High doses may enhance blood thinning.',
        recommendation: 'Monitor INR if on warfarin. Generally safe at moderate doses.',
        sources: ['FDA', 'American Heart Association']
      },
      immunosuppressants: {
        severity: 'moderate',
        mechanism: 'Immune modulation',
        description: 'May theoretically affect immune function.',
        recommendation: 'Monitor if on immunosuppressants.',
        sources: ['Cancer Research']
      }
    }
  },

  // Vitamin D
  vitamin_d: {
    name: 'Vitamin D3',
    category: 'supplement',
    commonNames: ['Vitamin D', 'Vitamin D3', 'Cholecalciferol'],
    mechanisms: ['Calcium absorption', 'Immune regulation', 'Gene expression'],
    contraindications: ['Hypercalcemia', 'Granulomatous diseases', 'Sarcoidosis'],
    interactions: {
      calcium: {
        severity: 'low',
        mechanism: 'Synergistic absorption',
        description: 'Vitamin D enhances calcium absorption.',
        recommendation: 'Safe and synergistic. Monitor total calcium intake.',
        sources: ['Institute of Medicine']
      },
      magnesium: {
        severity: 'low',
        mechanism: 'Cofactor relationship',
        description: 'Magnesium needed for vitamin D activation.',
        recommendation: 'Ensure adequate magnesium.',
        sources: ['Journal of the American Osteopathic Association']
      },
      thiazide_diuretics: {
        severity: 'moderate',
        mechanism: 'Hypercalcemia risk',
        description: 'Both increase calcium retention.',
        recommendation: 'Monitor calcium levels.',
        sources: ['FDA']
      }
    }
  },

  // Magnesium
  magnesium: {
    name: 'Magnesium',
    category: 'supplement',
    commonNames: ['Magnesium', 'Magnesium Glycinate', 'Magnesium Threonate'],
    mechanisms: ['Enzyme cofactor', 'NMDA receptor modulation', 'Muscle relaxation'],
    contraindications: ['Kidney failure', 'Heart block', 'Myasthenia gravis'],
    interactions: {
      vitamin_d: {
        severity: 'low',
        mechanism: 'Cofactor',
        description: 'Required for vitamin D activation.',
        recommendation: 'Ensure adequate magnesium with vitamin D supplementation.',
        sources: ['Journal of the American Osteopathic Association']
      },
      antibiotics: {
        severity: 'moderate',
        mechanism: 'Absorption interference',
        description: 'May reduce absorption of certain antibiotics.',
        recommendation: 'Take antibiotics 2+ hours before magnesium.',
        sources: ['NIH Office of Dietary Supplements']
      },
      bisphosphonates: {
        severity: 'moderate',
        mechanism: 'Absorption interference',
        description: 'Magnesium may reduce bisphosphonate absorption.',
        recommendation: 'Separate by 2+ hours.',
        sources: ['Mayo Clinic']
      }
    }
  },

  // Zinc
  zinc: {
    name: 'Zinc',
    category: 'supplement',
    commonNames: ['Zinc', 'Zinc Gluconate', 'Zinc Picolinate'],
    mechanisms: ['Immune function', 'Enzyme cofactor', 'Wound healing'],
    contraindications: ['Copper deficiency risk (high doses)'],
    interactions: {
      copper: {
        severity: 'moderate',
        mechanism: 'Competitive absorption',
        description: 'High dose zinc can cause copper deficiency.',
        recommendation: 'Take with copper if using high-dose zinc long-term.',
        sources: ['American Journal of Clinical Nutrition']
      },
      quinolone_antibiotics: {
        severity: 'moderate',
        mechanism: 'Chelation',
        description: 'Zinc binds to antibiotics reducing absorption.',
        recommendation: 'Separate by 2+ hours.',
        sources: ['FDA']
      }
    }
  }
};

// Helper function to normalize supplement names
export function normalizeSupplementName(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  
  for (const [key, data] of Object.entries(SUPPLEMENT_DATABASE)) {
    // Check primary name
    if (data.name.toLowerCase().includes(normalized)) {
      return key;
    }
    // Check common names
    for (const commonName of data.commonNames) {
      if (commonName.toLowerCase().includes(normalized) || normalized.includes(commonName.toLowerCase())) {
        return key;
      }
    }
  }
  
  return null;
}

// Check interactions between two supplements
export function checkInteraction(supplement1: string, supplement2: string): Interaction | null {
  const key1 = normalizeSupplementName(supplement1);
  const key2 = normalizeSupplementName(supplement2);
  
  if (!key1 || !key2) return null;
  
  // Check both directions
  const data1 = SUPPLEMENT_DATABASE[key1];
  const data2 = SUPPLEMENT_DATABASE[key2];
  
  // Look for supplement2 in supplement1's interactions
  for (const [interactionKey, interaction] of Object.entries(data1.interactions)) {
    if (normalizeSupplementName(interactionKey) === key2) {
      return interaction;
    }
  }
  
  // Look for supplement1 in supplement2's interactions
  for (const [interactionKey, interaction] of Object.entries(data2.interactions)) {
    if (normalizeSupplementName(interactionKey) === key1) {
      return interaction;
    }
  }
  
  return null;
}

// Get all contraindications for a supplement
export function getContraindications(supplement: string): string[] {
  const key = normalizeSupplementName(supplement);
  if (!key) return [];
  
  return SUPPLEMENT_DATABASE[key].contraindications;
}

// Get supplement mechanisms
export function getMechanisms(supplement: string): string[] {
  const key = normalizeSupplementName(supplement);
  if (!key) return [];
  
  return SUPPLEMENT_DATABASE[key].mechanisms;
}

// List all available supplements
export function listAvailableSupplements(): string[] {
  return Object.values(SUPPLEMENT_DATABASE).map(s => s.name);
}

// Search supplements by category
export function getSupplementsByCategory(category: SupplementData['category']): SupplementData[] {
  return Object.values(SUPPLEMENT_DATABASE).filter(s => s.category === category);
}
