// POST /api/biotech/search
// Searches across multiple free bio APIs: Examine, ChEMBL, ClinicalTrials, DIY Wiki, Wikidata, Europe PMC
// Supports synthesis via Groq for 'feed' mode

// Biotech Search API - searches across multiple free bio databases

interface SearchRequest {
  query: string;
  category: 'all' | 'supplements' | 'compounds' | 'trials' | 'protocols' | 'feed';
  synthesize?: boolean;
}

interface SynthesisResult {
  summary: string;
  categories: {
    papers: Array<{ title: string; relevance: string; keyFinding: string; url: string }>;
    trials: Array<{ title: string; phase: string; status: string; keyFinding: string; url: string }>;
    compounds: Array<{ name: string; mechanism: string; status: string }>;
  };
  keyInsights: string[];
  evidenceQuality: 'high' | 'moderate' | 'low';
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// CORS headers
const setCors = (res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export default async function handler(req: any, res: any) {
  setCors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const start = Date.now();
  
  try {
    const { query, category = 'all', synthesize = false } = req.body as SearchRequest;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const normalizedQuery = query.trim();

    // Handle 'feed' mode - Europe PMC + ClinicalTrials + Groq synthesis
    if (category === 'feed') {
      // Fetch sources in parallel
      const [europePMCResults, clinicalTrialsResults] = await Promise.allSettled([
        searchEuropePMC(normalizedQuery, 10),
        searchClinicalTrials(normalizedQuery)
      ]);

      const sources: any = {
        europepmc: europePMCResults.status === 'fulfilled' 
          ? { status: 'success', data: europePMCResults.value, count: europePMCResults.value.length }
          : { status: 'error', error: europePMCResults.reason?.message || 'Europe PMC search failed' },
        clinicaltrials: clinicalTrialsResults.status === 'fulfilled'
          ? { status: 'success', data: clinicalTrialsResults.value, count: clinicalTrialsResults.value.length }
          : { status: 'error', error: clinicalTrialsResults.reason?.message || 'ClinicalTrials search failed' }
      };

      // Attempt Groq synthesis if requested and we have at least one successful source
      let synthesis: SynthesisResult | null = null;
      let synthesisError: string | null = null;

      if (synthesize && (sources.europepmc.status === 'success' || sources.clinicaltrials.status === 'success')) {
        try {
          const filteredPapers = sources.europepmc.status === 'success' 
            ? sources.europepmc.data.slice(0, 3).map((p: any) => ({
                title: p.title,
                authors: p.authorString?.split(', ').slice(0, 3).join(', ') || 'Unknown',
                year: p.pubYear,
                journal: p.journalTitle,
                abstract: p.abstractText?.slice(0, 500) || '',
                pmid: p.pmid
              }))
            : [];

          const filteredTrials = sources.clinicaltrials.status === 'success'
            ? sources.clinicaltrials.data.slice(0, 3).map((t: any) => ({
                title: t.title,
                phase: t.phase,
                status: t.status,
                conditions: t.conditions?.slice(0, 2) || [],
                interventions: t.interventions?.slice(0, 2) || [],
                nctId: t.id
              }))
            : [];

          // 15 second timeout for Groq
          const groqPromise = synthesizeWithGroq(normalizedQuery, filteredPapers, filteredTrials);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Groq timeout')), 15000)
          );

          synthesis = await Promise.race([groqPromise, timeoutPromise]) as SynthesisResult;
        } catch (err) {
          synthesisError = err instanceof Error ? err.message : 'Synthesis failed';
          // synthesis remains null - graceful degradation
        }
      }

      return res.status(200).json({
        sources,
        synthesis,
        synthesisError,
        meta: {
          latency: Date.now() - start,
          timestamp: new Date().toISOString(),
          hasSynthesis: synthesis !== null
        }
      });
    }

    // Legacy mode - original behavior
    const promises: Promise<any>[] = [];
    const sourceNames: string[] = [];
    
    // Determine which sources to search based on category
    if (category === 'all' || category === 'supplements') {
      promises.push(searchExamine(normalizedQuery));
      sourceNames.push('examine');
    }
    
    if (category === 'all' || category === 'compounds') {
      promises.push(searchChEMBL(normalizedQuery));
      sourceNames.push('chembl');
      promises.push(searchWikidataCompounds(normalizedQuery));
      sourceNames.push('wikidata');
    }
    
    if (category === 'all' || category === 'trials') {
      promises.push(searchClinicalTrials(normalizedQuery));
      sourceNames.push('clinicaltrials');
    }
    
    if (category === 'all' || category === 'protocols') {
      promises.push(searchDIYBiohacking(normalizedQuery));
      sourceNames.push('diybiohacking');
    }

    // Run all searches in parallel
    const results = await Promise.allSettled(promises);
    
    const aggregated: any = {
      query,
      category,
      sources: {},
      meta: {
        latency: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    };

    results.forEach((result, index) => {
      const name = sourceNames[index];
      
      if (result.status === 'fulfilled') {
        aggregated.sources[name] = {
          status: 'success',
          data: result.value,
          count: Array.isArray(result.value) ? result.value.length : 0
        };
      } else {
        aggregated.sources[name] = {
          status: 'error',
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    // Cache headers - 5 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json(aggregated);

  } catch (error) {
    console.error('Biotech search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: (error as Error).message,
      meta: { latency: Date.now() - start }
    });
  }
}

// Search Europe PMC (Europe PubMed Central) - free, no key required
async function searchEuropePMC(query: string, maxResults: number = 10) {
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=${maxResults}&sort_date=y&resultType=core`;
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'NERV-Dashboard/1.0' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    return (data.resultList?.result || []).map((item: any) => ({
      pmid: item.pmid,
      title: item.title,
      authorString: item.authorString,
      journalTitle: item.journalTitle,
      pubYear: item.pubYear,
      abstractText: item.abstractText,
      doi: item.doi,
      source: 'Europe PMC',
      url: `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
    }));
  } catch (error) {
    console.error('Europe PMC search error:', error);
    throw error;
  }
}

// Groq synthesis function
async function synthesizeWithGroq(
  query: string,
  papers: any[],
  trials: any[]
): Promise<SynthesisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const systemPrompt = `You are a biotech research analyst. Synthesize the provided research findings into a structured JSON report.

INPUT FORMAT:
- User query: what they searched for
- Top papers (max 3): title, authors, year, journal, abstract snippet
- Top trials (max 3): title, phase, status, conditions, interventions

OUTPUT FORMAT (strict JSON):
{
  "summary": "2-3 sentence executive summary of findings related to the query",
  "categories": {
    "papers": [
      { 
        "title": "exact paper title",
        "relevance": "High|Medium|Low", 
        "keyFinding": "1-sentence key takeaway",
        "url": "https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
      }
    ],
    "trials": [
      {
        "title": "exact trial title",
        "phase": "Phase I|II|III|IV",
        "status": "Recruiting|Completed|etc",
        "keyFinding": "1-sentence key takeaway",
        "url": "https://clinicaltrials.gov/study/{nctId}"
      }
    ],
    "compounds": [
      {
        "name": "compound or intervention name",
        "mechanism": "brief mechanism if known",
        "status": "experimental|approved|investigational"
      }
    ]
  },
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "evidenceQuality": "high|moderate|low"
}

RULES:
- Be concise but specific
- Only cite findings from provided data
- Flag limitations or gaps in evidence
- Use cautious language ("may", "suggests", "preliminary")
- If no relevant results, return evidenceQuality: "low" and explain gap
- Return ONLY valid JSON, no markdown formatting`;

  const userContent = `Query: "${query}"

Papers (${papers.length}):
${papers.map((p, i) => `${i + 1}. "${p.title}" - ${p.authors} (${p.year}) - ${p.journal}
   Abstract: ${p.abstract?.slice(0, 200)}...`).join('\n\n')}

Trials (${trials.length}):
${trials.map((t, i) => `${i + 1}. "${t.title}" - Phase: ${t.phase}, Status: ${t.status}
   Conditions: ${t.conditions?.join(', ')}
   Interventions: ${t.interventions?.join(', ')}`).join('\n\n')}`;

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Groq error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from Groq');
  }

  try {
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || 'No summary available',
      categories: {
        papers: parsed.categories?.papers || [],
        trials: parsed.categories?.trials || [],
        compounds: parsed.categories?.compounds || []
      },
      keyInsights: parsed.keyInsights || [],
      evidenceQuality: parsed.evidenceQuality || 'low'
    };
  } catch (e) {
    throw new Error('Failed to parse Groq response as JSON');
  }
}

// Search Examine.com via community scraper (GitHub)
async function searchExamine(query: string) {
  try {
    const url = 'https://raw.githubusercontent.com/tytydraco/ExamineScraper/main/examine.json';
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    const results = [];
    for (const [name, info] of Object.entries(data)) {
      if (results.length >= 10) break;
      
      const content = JSON.stringify(info).toLowerCase();
      if (name.toLowerCase().includes(query) || content.includes(query)) {
        results.push({
          name,
          ...(info as any),
          source: 'Examine.com',
          url: `https://examine.com/supplements/${name.toLowerCase().replace(/\s+/g, '-')}/`
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Examine search error:', error);
    return [];
  }
}

// Search ChEMBL (EBI)
async function searchChEMBL(query: string) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.ebi.ac.uk/chembl/api/data/molecule/search?q=${encodedQuery}&limit=10&format=json`;
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'BiotechSearch/1.0' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    return (data.molecules || []).map((mol: any) => ({
      id: mol.molecule_chembl_id,
      name: mol.pref_name || mol.molecule_structures?.canonical_smiles?.slice(0, 30) + '...',
      smiles: mol.molecule_structures?.canonical_smiles,
      formula: mol.molecule_properties?.full_molformula,
      mw: mol.molecule_properties?.full_mwt,
      max_phase: mol.max_phase,
      first_approval: mol.first_approval,
      therapeutic_flag: mol.therapeutic_flag,
      source: 'ChEMBL',
      url: `https://www.ebi.ac.uk/chembl/compound_report_card/${mol.molecule_chembl_id}/`
    }));
  } catch (error) {
    console.error('ChEMBL search error:', error);
    return [];
  }
}

// Search ClinicalTrials.gov
async function searchClinicalTrials(query: string, maxResults: number = 10) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodedQuery}&pageSize=${maxResults}&format=json`;
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    return (data.studies || []).map((study: any) => ({
      id: study.protocolSection?.identificationModule?.nctId,
      title: study.protocolSection?.identificationModule?.briefTitle,
      status: study.protocolSection?.statusModule?.overallStatus,
      phase: study.protocolSection?.designModule?.phases?.join(', ') || 'N/A',
      conditions: study.protocolSection?.conditionsModule?.conditions || [],
      interventions: study.protocolSection?.armsInterventionsModule?.interventions?.map((i: any) => i.name) || [],
      source: 'ClinicalTrials.gov',
      url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`
    })).filter((s: any) => s.id);
  } catch (error) {
    console.error('ClinicalTrials search error:', error);
    return [];
  }
}

// Search DIY Biohacking Wiki (GitHub)
async function searchDIYBiohacking(query: string) {
  try {
    const url = 'https://raw.githubusercontent.com/kanzure/diyhpluswiki/master/longevity.mdwn';
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    
    const lines = text.split('\n');
    const results = [];
    let currentSection = '';
    let buffer: string[] = [];
    
    for (const line of lines) {
      // Section headers in markdown: = Section =
      if (line.startsWith('= ') || line.startsWith('== ')) {
        // Save previous section if it matches query
        const content = buffer.join(' ').toLowerCase();
        if (buffer.length > 0 && (content.includes(query) || currentSection.toLowerCase().includes(query))) {
          results.push({
            title: currentSection.replace(/=/g, '').trim(),
            content: buffer.slice(0, 15).join('\n'), // First 15 lines
            fullContent: buffer.join('\n'),
            source: 'DIY Biohacking Wiki',
            url: 'https://github.com/kanzure/diyhpluswiki/blob/master/longevity.mdwn'
          });
          
          if (results.length >= 5) break;
        }
        
        currentSection = line;
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
    
    return results;
  } catch (error) {
    console.error('DIY Biohacking search error:', error);
    return [];
  }
}

// Search Wikidata for compounds
async function searchWikidataCompounds(query: string) {
  try {
    const sparqlQuery = `
      SELECT DISTINCT ?compound ?compoundLabel ?description ?typeLabel
      WHERE {
        ?compound wdt:P31 ?type .
        ?compound rdfs:label ?label .
        FILTER(CONTAINS(LCASE(?label), "${query}"))
        FILTER(LANG(?label) = "en")
        OPTIONAL { ?compound schema:description ?description . FILTER(LANG(?description) = "en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT 10
    `;
    
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(8000),
      headers: { 
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'BiotechSearch/1.0' 
      }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    return (data.results?.bindings || []).map((binding: any) => ({
      id: binding.compound?.value?.split('/').pop(),
      label: binding.compoundLabel?.value,
      description: binding.description?.value,
      type: binding.typeLabel?.value,
      source: 'Wikidata',
      url: binding.compound?.value
    }));
  } catch (error) {
    console.error('Wikidata search error:', error);
    return [];
  }
}
