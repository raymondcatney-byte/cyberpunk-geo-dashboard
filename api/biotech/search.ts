// POST /api/biotech/search
// Searches across multiple free bio APIs: Examine, ChEMBL, ClinicalTrials, DIY Wiki, Wikidata

// Biotech Search API - searches across multiple free bio databases

interface SearchRequest {
  query: string;
  category: 'all' | 'supplements' | 'compounds' | 'trials' | 'protocols';
}

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
    const { query, category = 'all' } = req.body as SearchRequest;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const normalizedQuery = query.trim().toLowerCase();
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
async function searchClinicalTrials(query: string) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodedQuery}&pageSize=10&format=json`;
    
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000)
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
