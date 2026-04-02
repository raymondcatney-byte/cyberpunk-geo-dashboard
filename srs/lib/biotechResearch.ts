/**
 * Biotech Research Service
 * PubMed integration and web search synthesis for health/biotech queries
 * Lite version - no external AI services beyond existing Groq
 */

// Web search integration - can be added later when available
// import { searchWeb } from './intelligence';

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  url: string;
}

export interface ResearchResult {
  query: string;
  summary: string;
  articles: PubMedArticle[];
  confidence: 'high' | 'moderate' | 'low' | 'insufficient';
  evidenceLevel: 'systematic_review' | 'rct' | 'cohort' | 'observational' | 'preclinical' | 'unknown';
  recommendations: string[];
  safetyNotes: string[];
  timestamp: string;
}

// PubMed E-utilities API base URL
const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Search PubMed for articles
 * Free API, no key required for basic usage
 */
export async function searchPubMed(query: string, maxResults: number = 10): Promise<PubMedArticle[]> {
  try {
    // Step 1: Search for PMIDs
    const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=date`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const pmids: string[] = searchData.esearchresult?.idlist || [];
    
    if (pmids.length === 0) {
      return [];
    }
    
    // Step 2: Fetch article details
    const summaryUrl = `${PUBMED_API_BASE}/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`;
    
    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) {
      throw new Error(`PubMed summary failed: ${summaryResponse.status}`);
    }
    
    const summaryData = await summaryResponse.json();
    const result = summaryData.result;
    
    // Parse articles
    const articles: PubMedArticle[] = [];
    
    for (const pmid of pmids) {
      const articleData = result[pmid];
      if (!articleData) continue;
      
      articles.push({
        pmid,
        title: articleData.title || 'No title available',
        abstract: '', // Would need efetch for abstracts (more API calls)
        authors: (articleData.authors || []).map((a: any) => a.name),
        journal: articleData.source || 'Unknown journal',
        year: articleData.pubdate ? parseInt(articleData.pubdate.split(' ')[0]) : 0,
        doi: articleData.elocationid || undefined,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      });
    }
    
    return articles;
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

/**
 * Calculate confidence based on available evidence
 */
function calculateConfidence(articles: PubMedArticle[], hasWebResults: boolean = false): ResearchResult['confidence'] {
  if (articles.length >= 5) {
    return 'high';
  } else if (articles.length >= 2) {
    return 'moderate';
  } else if (articles.length > 0) {
    return 'low';
  }
  return 'insufficient';
}

/**
 * Estimate evidence level from article titles and sources
 */
function estimateEvidenceLevel(articles: PubMedArticle[]): ResearchResult['evidenceLevel'] {
  const titles = articles.map(a => a.title.toLowerCase()).join(' ');
  
  if (titles.includes('systematic review') || titles.includes('meta-analysis')) {
    return 'systematic_review';
  } else if (titles.includes('randomized') || titles.includes('double-blind')) {
    return 'rct';
  } else if (titles.includes('cohort') || titles.includes('prospective')) {
    return 'cohort';
  } else if (titles.includes('observational') || titles.includes('cross-sectional')) {
    return 'observational';
  } else if (titles.includes('in vitro') || titles.includes('mouse') || titles.includes('rat')) {
    return 'preclinical';
  }
  
  return 'unknown';
}

/**
 * Main research function
 * Combines PubMed and web search for comprehensive results
 */
export async function researchBiotechQuery(query: string): Promise<ResearchResult> {
  console.log(`[BiotechResearch] Researching: ${query}`);
  
  // Search PubMed (web search can be added later)
  const pubMedArticles = await searchPubMed(query, 5);
  
  const confidence = calculateConfidence(pubMedArticles, false);
  const evidenceLevel = estimateEvidenceLevel(pubMedArticles);
  
  // Generate recommendations based on articles
  const recommendations = generateRecommendations(pubMedArticles, query);
  
  // Generate safety notes
  const safetyNotes = generateSafetyNotes(pubMedArticles, query);
  
  // Create summary (in production, would use Groq to synthesize)
  const summary = generateSummary(pubMedArticles, query, confidence);
  
  return {
    query,
    summary,
    articles: pubMedArticles,
    confidence,
    evidenceLevel,
    recommendations,
    safetyNotes,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate simple recommendations based on article content
 */
function generateRecommendations(articles: PubMedArticle[], query: string): string[] {
  const recommendations: string[] = [];
  
  if (articles.length === 0) {
    recommendations.push('Limited published research available. Consult healthcare provider.');
    return recommendations;
  }
  
  const titles = articles.map(a => a.title.toLowerCase()).join(' ');
  
  // Common recommendation patterns
  if (titles.includes('efficacy') || titles.includes('effective')) {
    recommendations.push('Evidence suggests potential efficacy; individual results may vary.');
  }
  
  if (titles.includes('safety') || titles.includes('adverse')) {
    recommendations.push('Review safety profile before starting. Monitor for side effects.');
  }
  
  if (titles.includes('dose') || titles.includes('dosage')) {
    recommendations.push('Follow evidence-based dosing protocols from clinical trials.');
  }
  
  if (query.toLowerCase().includes('interact')) {
    recommendations.push('Check for drug-supplement interactions before combining.');
  }
  
  // Default if no specific patterns
  if (recommendations.length === 0) {
    recommendations.push('Review available research and consult healthcare provider.');
    recommendations.push('Start with conservative dosing if proceeding.');
  }
  
  return recommendations;
}

/**
 * Generate safety notes from articles
 */
function generateSafetyNotes(articles: PubMedArticle[], query: string): string[] {
  const notes: string[] = [];
  
  const titles = articles.map(a => a.title.toLowerCase()).join(' ');
  const abstracts = articles.map(a => a.abstract.toLowerCase()).join(' ');
  const content = titles + ' ' + abstracts;
  
  if (content.includes('side effect') || content.includes('adverse')) {
    notes.push('Adverse effects reported in literature. Monitor carefully.');
  }
  
  if (content.includes('contraindicated') || content.includes('contraindication')) {
    notes.push('Contraindications exist. Ensure none apply to you.');
  }
  
  if (content.includes('pregnancy') || content.includes('lactation')) {
    notes.push('Special considerations for pregnancy/lactation. Consult doctor.');
  }
  
  if (content.includes('liver') || content.includes('kidney')) {
    notes.push('May affect liver/kidney function. Monitor if pre-existing conditions.');
  }
  
  // Default
  if (notes.length === 0) {
    notes.push('General safety data limited. Start conservatively.');
  }
  
  return notes;
}

/**
 * Generate a basic summary
 * In production, would use Groq API for synthesis
 */
function generateSummary(articles: PubMedArticle[], query: string, confidence: ResearchResult['confidence']): string {
  if (articles.length === 0) {
    return 'Limited peer-reviewed research found for this query. Consider consulting primary literature or healthcare providers.';
  }
  
  const evidenceCount = articles.length;
  const years = articles.map(a => a.year).filter(y => y > 0);
  const recentYear = years.length > 0 ? Math.max(...years) : 'recent';
  
  return `Found ${evidenceCount} relevant PubMed articles (most recent: ${recentYear}). ${confidence === 'high' ? 'Strong evidence base available.' : confidence === 'moderate' ? 'Moderate evidence exists.' : 'Limited evidence available.'} Review individual studies for detailed findings.`;
}

/**
 * Quick check for supplement safety
 */
export async function quickSafetyCheck(supplement: string): Promise<{
  safe: boolean;
  warnings: string[];
  evidenceCount: number;
}> {
  const query = `${supplement} safety adverse effects`;
  const articles = await searchPubMed(query, 3);
  
  const titles = articles.map(a => a.title.toLowerCase()).join(' ');
  const warnings: string[] = [];
  
  if (titles.includes('toxic') || titles.includes('poisoning')) {
    warnings.push('Toxicity concerns in literature');
  }
  
  if (titles.includes('death') || titles.includes('fatal')) {
    warnings.push('Serious adverse events reported');
  }
  
  if (titles.includes('liver') && titles.includes('damage')) {
    warnings.push('Hepatotoxicity risk');
  }
  
  return {
    safe: warnings.length === 0,
    warnings,
    evidenceCount: articles.length
  };
}

// Types are already exported above
