/**
 * Consolidated Intelligence Feeds API
 * Combines GDELT, NewsAPI, PubMed, AIS Vessels, NASA FIRMS, and OONI Censorship
 * into one serverless function to stay within Vercel Hobby plan limits (12 functions max)
 */

// GDELT event types
interface GDELTEvent {
  id: string;
  location: { lat?: number; lng?: number; country?: string };
  title: string;
  summary: string;
  theme: string;
  source: string;
  timestamp: string;
  tone?: number;
}

// PubMed article types
interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string | null;
  pubDate: string;
  authors: string[];
  journal: string;
  url: string;
}

// News article types
type NewsCategory = 'geopolitical' | 'economic' | 'conflict' | 'technology';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { id: string | null; name: string };
  sentiment: 'positive' | 'negative' | 'neutral';
}

// AIS Vessel types
interface AISVessel {
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  vesselType: string;
  destination?: string;
  lastUpdate: string;
}

// NASA FIRMS thermal signature types
interface FIRMSDetection {
  latitude: number;
  longitude: number;
  brightness: number; // Temperature in Kelvin
  scan: number; // Scan angle
  track: number; // Track angle
  acq_date: string;
  acq_time: string;
  satellite: string; // 'T' = Terra, 'A' = Aqua
  confidence: string; // 'nominal', 'low', 'high'
  version: string;
  bright_t31: number; // Channel 31 brightness
  frp: number; // Fire Radiative Power in MW
  daynight: string; // 'D' or 'N'
  id: string;
}

// OONI censorship measurement types
interface OONIMeasurement {
  measurement_url: string;
  report_id: string;
  input?: string;
  probe_cc: string; // Country code
  probe_asn: number;
  test_name: string;
  measurement_start_time: string;
  anomaly: boolean;
  confirmed: boolean;
  failure: boolean;
}

// OONI aggregated stats types
interface OONIStats {
  anomaly_count: number;
  confirmed_count: number;
  failure_count: number;
  measurement_count: number;
  probe_cc: string;
}

// GDELT fetch function
async function fetchGDELT(theme?: string, country?: string, hours: number = 24): Promise<{ ok: boolean; events: GDELTEvent[]; meta: object }> {
  const conflictThemes = ['CONFLICT', 'PROTEST', 'CRISIS', 'SANCTION', 'TERROR', 'WAR', 'VIOLENCE'];
  const queryThemes = theme ? [theme] : conflictThemes;
  
  const allEvents: GDELTEvent[] = [];
  
  for (const t of queryThemes.slice(0, 3)) {
    try {
      const query = country ? `${t} ${country}` : t;
      const gdeltUrl = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&mode=PointData&format=json`;
      
      const response = await fetch(gdeltUrl, { 
        signal: AbortSignal.timeout(8000)
      });
      
      if (!response.ok) continue;
      
      const data = await response.json() as { features?: Array<{
        properties?: {
          name?: string;
          url?: string;
          theme?: string;
          sentiment?: number;
        };
        geometry?: {
          coordinates?: [number, number];
        }
      }> };
      
      if (data.features) {
        const events = data.features.slice(0, 15).map((f, idx) => ({
          id: `gdelt-${t}-${idx}`,
          location: {
            lat: f.geometry?.coordinates?.[1],
            lng: f.geometry?.coordinates?.[0],
            country: country || 'Unknown',
          },
          title: f.properties?.name || `${t} Event`,
          summary: f.properties?.name || '',
          theme: t,
          source: f.properties?.url || 'GDELT',
          timestamp: new Date().toISOString(),
          tone: f.properties?.sentiment,
        }));
        allEvents.push(...events);
      }
    } catch {
      // Continue with next theme
    }
  }
  
  return {
    ok: true,
    events: allEvents.slice(0, 50),
    meta: { theme, country, hours, total: allEvents.length },
  };
}

// NewsAPI fetch function
async function fetchNews(category: NewsCategory): Promise<{ ok: boolean; articles: NewsArticle[]; meta: object }> {
  const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
  if (!NEWSAPI_KEY) {
    throw new Error('NEWSAPI_KEY not configured');
  }

  const categoryQueries: Record<NewsCategory, string> = {
    geopolitical: 'sanctions OR diplomacy OR treaty OR alliance',
    economic: 'trade war OR tariffs OR central bank OR inflation crisis',
    conflict: 'military exercise OR border dispute OR airstrike OR naval',
    technology: 'cyber attack OR semiconductor export OR AI regulation',
  };

  const query = categoryQueries[category];
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&language=en&sortBy=relevancy&pageSize=10&apiKey=${NEWSAPI_KEY}`;
  
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }
  
  const data = await response.json() as { 
    articles?: Array<{
      title: string;
      description: string | null;
      url: string;
      publishedAt: string;
      source: { id: string | null; name: string };
    }> 
  };
  
  const articles: NewsArticle[] = (data.articles || []).map((a) => {
    const text = `${a.title} ${a.description || ''}`.toLowerCase();
    const sentiment: NewsArticle['sentiment'] =
      text.includes('crisis') || text.includes('attack') || text.includes('war')
        ? 'negative'
        : text.includes('breakthrough') || text.includes('deal') || text.includes('agreement')
          ? 'positive'
          : 'neutral';
    
    return {
      title: a.title,
      description: a.description || '',
      url: a.url,
      publishedAt: a.publishedAt,
      source: a.source,
      sentiment,
    };
  });
  
  return {
    ok: true,
    articles,
    meta: { category, query, count: articles.length },
  };
}

// PubMed fetch function
async function fetchPubMed(searchQuery: string): Promise<{ ok: boolean; articles: PubMedArticle[]; totalResults: number; query: string }> {
  // Step 1: Search for article IDs
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchQuery)}&retmax=10&retmode=json&sort=relevance`;
  
  const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
  if (!searchResponse.ok) {
    throw new Error(`PubMed search error: ${searchResponse.status}`);
  }
  
  const searchData = await searchResponse.json() as { 
    esearchresult?: { 
      idlist?: string[];
      count?: string;
    } 
  };
  
  const ids = searchData.esearchresult?.idlist || [];
  const totalResults = parseInt(searchData.esearchresult?.count || '0', 10);
  
  if (ids.length === 0) {
    return { ok: true, articles: [], totalResults: 0, query: searchQuery };
  }
  
  // Step 2: Get article summaries
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  
  const summaryResponse = await fetch(summaryUrl, { signal: AbortSignal.timeout(10000) });
  if (!summaryResponse.ok) {
    throw new Error(`PubMed summary error: ${summaryResponse.status}`);
  }
  
  const summaryData = await summaryResponse.json() as {
    result?: Record<string, {
      title?: string;
      sorttitle?: string;
      source?: string;
      authors?: Array<{ name: string }>;
      pubdate?: string;
    }>;
  };
  
  const articles: PubMedArticle[] = ids.map((id) => {
    const article = summaryData.result?.[id];
    return {
      pmid: id,
      title: article?.title || article?.sorttitle || 'Unknown Title',
      abstract: null, // Would require separate efetch call
      pubDate: article?.pubdate || 'Unknown',
      authors: (article?.authors || []).map((a) => a.name),
      journal: article?.source || 'Unknown Journal',
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  });
  
  return { ok: true, articles, totalResults, query: searchQuery };
}

// AIS Vessels fetch function (mock data - replace with real AIS API)
async function fetchVessels(region?: string): Promise<{ ok: boolean; vessels: AISVessel[]; meta: object }> {
  // Mock vessel data for development
  const MOCK_VESSELS: AISVessel[] = [
    {
      mmsi: "352001234",
      name: "COSCO SHANGHAI",
      lat: 26.5,
      lng: 56.2,
      speed: 12.5,
      heading: 45,
      vesselType: "Container Ship",
      destination: "Singapore",
      lastUpdate: new Date().toISOString(),
    },
    {
      mmsi: "636019876",
      name: "MAERSK EINDHOVEN",
      lat: 12.4,
      lng: 43.1,
      speed: 8.2,
      heading: 120,
      vesselType: "Container Ship",
      destination: "Jeddah",
      lastUpdate: new Date().toISOString(),
    },
    {
      mmsi: "311000456",
      name: "OIL TANKER ALPHA",
      lat: 26.3,
      lng: 56.4,
      speed: 6.0,
      heading: 90,
      vesselType: "Oil Tanker",
      destination: "Fujairah",
      lastUpdate: new Date().toISOString(),
    },
    {
      mmsi: "255806147",
      name: "EVER GIVEN",
      lat: 30.0,
      lng: 32.5,
      speed: 5.5,
      heading: 180,
      vesselType: "Container Ship",
      destination: "Suez Canal",
      lastUpdate: new Date().toISOString(),
    },
    {
      mmsi: "563040791",
      name: "HOUthis TARGET",
      lat: 14.5,
      lng: 42.0,
      speed: 15.2,
      heading: 60,
      vesselType: "Bulk Carrier",
      destination: "Red Sea",
      lastUpdate: new Date().toISOString(),
    },
  ];
  
  // Filter by region
  let vessels = MOCK_VESSELS;
  if (region === 'red_sea') {
    vessels = vessels.filter(v => v.lat > 10 && v.lat < 30 && v.lng > 30 && v.lng < 50);
  } else if (region === 'south_china_sea') {
    vessels = vessels.filter(v => v.lat > 0 && v.lat < 25 && v.lng > 100 && v.lng < 130);
  } else if (region === 'mediterranean') {
    vessels = vessels.filter(v => v.lat > 30 && v.lat < 45 && v.lng > -5 && v.lng < 40);
  }
  
  // Add slight movement for realism
  vessels = vessels.map(v => ({
    ...v,
    lat: v.lat + (Math.random() - 0.5) * 0.02,
    lng: v.lng + (Math.random() - 0.5) * 0.02,
    lastUpdate: new Date().toISOString(),
  }));
  
  return {
    ok: true,
    vessels,
    meta: { region: region || 'global', count: vessels.length, source: 'mock' },
  };
}

// NASA FIRMS thermal signature fetch function
async function fetchFIRMS(region?: string, days: number = 1): Promise<{ ok: boolean; detections: FIRMSDetection[]; meta: object }> {
  // FIRMS requires API key for production use
  // Using VIIRS NOAA-20 Near Real Time data
  // For free tier, we'll use a limited dataset or mock in development
  
  const FIRMS_KEY = process.env.FIRMS_API_KEY;
  
  if (!FIRMS_KEY) {
    // Return mock data if no API key
    return fetchFIRMSMock(region, days);
  }
  
  try {
    // NASA FIRMS API endpoint
    // Format: /api/area/csv/{MAP_KEY}/{SOURCE}/{LAT}/{LON}/{DETECT_DISTANCE}
    // Using GeoJSON format for easier parsing
    const worldBounds = '90/-180/-90/180'; // North, West, South, East
    
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/json/${FIRMS_KEY}/VIIRS_NOAA20_NRT/${worldBounds}/${days}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    
    if (!response.ok) {
      throw new Error(`FIRMS API error: ${response.status}`);
    }
    
    const data = await response.json() as FIRMSDetection[];
    
    // Filter by region if specified
    let detections = data;
    if (region) {
      const regionBounds = getRegionBounds(region);
      if (regionBounds) {
        detections = detections.filter(d => 
          d.latitude <= regionBounds.north &&
          d.latitude >= regionBounds.south &&
          d.longitude <= regionBounds.east &&
          d.longitude >= regionBounds.west
        );
      }
    }
    
    // Filter to high confidence only
    detections = detections.filter(d => d.confidence === 'high' || d.frp > 10);
    
    return {
      ok: true,
      detections: detections.slice(0, 100), // Limit results
      meta: { 
        region: region || 'global', 
        count: detections.length, 
        days,
        source: 'NASA FIRMS VIIRS NOAA-20 NRT'
      },
    };
  } catch (error) {
    console.error('[FIRMS Error]', error);
    // Fallback to mock data on error
    return fetchFIRMSMock(region, days);
  }
}

// Helper function for region bounds
function getRegionBounds(region: string): { north: number; south: number; east: number; west: number } | null {
  const bounds: Record<string, { north: number; south: number; east: number; west: number }> = {
    'ukraine': { north: 52.5, south: 44.3, east: 40.2, west: 22.1 },
    'gaza': { north: 31.6, south: 31.2, east: 34.6, west: 34.2 },
    'red_sea': { north: 30.0, south: 12.0, east: 45.0, west: 32.0 },
    'middle_east': { north: 42.0, south: 12.0, east: 63.0, west: 26.0 },
    'taiwan_strait': { north: 26.0, south: 21.0, east: 123.0, west: 117.0 },
  };
  return bounds[region.toLowerCase()] || null;
}

// Mock FIRMS data for development
async function fetchFIRMSMock(region?: string, days: number = 1): Promise<{ ok: boolean; detections: FIRMSDetection[]; meta: object }> {
  // Mock thermal detections for active conflict zones
  const MOCK_DETECTIONS: FIRMSDetection[] = [
    // Ukraine
    { latitude: 48.0, longitude: 37.8, brightness: 350.5, scan: 0.5, track: 0.5, acq_date: new Date().toISOString().split('T')[0], acq_time: '1200', satellite: 'A', confidence: 'high', version: '1.0', bright_t31: 300.2, frp: 45.2, daynight: 'D', id: 'firms-ukr-1' },
    { latitude: 47.5, longitude: 36.2, brightness: 340.1, scan: 0.5, track: 0.5, acq_date: new Date().toISOString().split('T')[0], acq_time: '1215', satellite: 'T', confidence: 'high', version: '1.0', bright_t31: 295.5, frp: 32.8, daynight: 'D', id: 'firms-ukr-2' },
    // Gaza
    { latitude: 31.5, longitude: 34.4, brightness: 365.2, scan: 0.5, track: 0.5, acq_date: new Date().toISOString().split('T')[0], acq_time: '1400', satellite: 'A', confidence: 'high', version: '1.0', bright_t31: 310.5, frp: 78.5, daynight: 'D', id: 'firms-gaza-1' },
    { latitude: 31.4, longitude: 34.5, brightness: 355.8, scan: 0.5, track: 0.5, acq_date: new Date().toISOString().split('T')[0], acq_time: '1415', satellite: 'T', confidence: 'high', version: '1.0', bright_t31: 305.2, frp: 56.3, daynight: 'D', id: 'firms-gaza-2' },
    // Red Sea area (potential strikes)
    { latitude: 15.0, longitude: 42.0, brightness: 330.5, scan: 0.5, track: 0.5, acq_date: new Date().toISOString().split('T')[0], acq_time: '0800', satellite: 'A', confidence: 'nominal', version: '1.0', bright_t31: 290.1, frp: 15.2, daynight: 'D', id: 'firms-red-1' },
    // Industrial fires (normal)
    { latitude: 25.2, longitude: 55.3, brightness: 320.1, scan: 0.5, track: 0.5, acq_date: new Date().toISOString().split('T')[0], acq_time: '1000', satellite: 'T', confidence: 'low', version: '1.0', bright_t31: 285.5, frp: 8.5, daynight: 'D', id: 'firms-dubai-1' },
  ];
  
  let detections = MOCK_DETECTIONS;
  
  // Filter by region
  if (region) {
    const bounds = getRegionBounds(region);
    if (bounds) {
      detections = detections.filter(d => 
        d.latitude <= bounds.north &&
        d.latitude >= bounds.south &&
        d.longitude <= bounds.east &&
        d.longitude >= bounds.west
      );
    }
  }
  
  return {
    ok: true,
    detections,
    meta: { 
      region: region || 'global', 
      count: detections.length, 
      days,
      source: 'mock',
      note: 'Add FIRMS_API_KEY environment variable for real data'
    },
  };
}

// OONI censorship monitoring fetch function
async function fetchOONI(countryCode?: string, since?: string): Promise<{ ok: boolean; measurements: OONIMeasurement[]; stats: OONIStats[]; meta: object }> {
  try {
    const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Fetch recent measurements
    let url = `https://api.ooni.io/api/v1/measurements?since=${sinceDate}&limit=50&order_by=measurement_start_time&order=desc`;
    
    if (countryCode) {
      url += `&probe_cc=${countryCode.toUpperCase()}`;
    }
    
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!response.ok) {
      throw new Error(`OONI API error: ${response.status}`);
    }
    
    const data = await response.json() as { 
      results?: OONIMeasurement[];
      metadata?: { count: number; current_page: number; limit: number; next_url?: string };
    };
    
    const measurements = (data.results || []).filter(m => m.anomaly || m.confirmed);
    
    // Aggregate stats by country
    const statsMap = new Map<string, OONIStats>();
    measurements.forEach(m => {
      const cc = m.probe_cc;
      if (!statsMap.has(cc)) {
        statsMap.set(cc, {
          probe_cc: cc,
          anomaly_count: 0,
          confirmed_count: 0,
          failure_count: 0,
          measurement_count: 0,
        });
      }
      const stats = statsMap.get(cc)!;
      stats.measurement_count++;
      if (m.confirmed) stats.confirmed_count++;
      else if (m.anomaly) stats.anomaly_count++;
      if (m.failure) stats.failure_count++;
    });
    
    return {
      ok: true,
      measurements,
      stats: Array.from(statsMap.values()),
      meta: {
        country: countryCode || 'all',
        since: sinceDate,
        total: data.metadata?.count || 0,
        filtered: measurements.length,
        source: 'OONI Probe Network',
      },
    };
  } catch (error) {
    console.error('[OONI Error]', error);
    // Return mock data on error
    return fetchOONIMock(countryCode, since);
  }
}

// Mock OONI data for development
async function fetchOONIMock(countryCode?: string, since?: string): Promise<{ ok: boolean; measurements: OONIMeasurement[]; stats: OONIStats[]; meta: object }> {
  const MOCK_MEASUREMENTS: OONIMeasurement[] = [
    // Russia - blocks
    { measurement_url: 'https://explorer.ooni.org/m/123', report_id: 'r-1', input: 'twitter.com', probe_cc: 'RU', probe_asn: 12345, test_name: 'web_connectivity', measurement_start_time: new Date().toISOString(), anomaly: false, confirmed: true, failure: false },
    { measurement_url: 'https://explorer.ooni.org/m/124', report_id: 'r-2', input: 'facebook.com', probe_cc: 'RU', probe_asn: 12345, test_name: 'web_connectivity', measurement_start_time: new Date().toISOString(), anomaly: false, confirmed: true, failure: false },
    // Iran - blocks
    { measurement_url: 'https://explorer.ooni.org/m/125', report_id: 'r-3', input: 'whatsapp.com', probe_cc: 'IR', probe_asn: 12346, test_name: 'web_connectivity', measurement_start_time: new Date().toISOString(), anomaly: false, confirmed: true, failure: false },
    // China - blocks
    { measurement_url: 'https://explorer.ooni.org/m/126', report_id: 'r-4', input: 'google.com', probe_cc: 'CN', probe_asn: 12347, test_name: 'web_connectivity', measurement_start_time: new Date().toISOString(), anomaly: false, confirmed: true, failure: false },
    // Anomalies (suspicious but not confirmed)
    { measurement_url: 'https://explorer.ooni.org/m/127', report_id: 'r-5', input: 'bbc.com', probe_cc: 'EG', probe_asn: 12348, test_name: 'web_connectivity', measurement_start_time: new Date().toISOString(), anomaly: true, confirmed: false, failure: false },
  ];
  
  let measurements = MOCK_MEASUREMENTS;
  if (countryCode) {
    measurements = measurements.filter(m => m.probe_cc === countryCode.toUpperCase());
  }
  
  // Calculate stats
  const statsMap = new Map<string, OONIStats>();
  measurements.forEach(m => {
    const cc = m.probe_cc;
    if (!statsMap.has(cc)) {
      statsMap.set(cc, {
        probe_cc: cc,
        anomaly_count: 0,
        confirmed_count: 0,
        failure_count: 0,
        measurement_count: 0,
      });
    }
    const stats = statsMap.get(cc)!;
    stats.measurement_count++;
    if (m.confirmed) stats.confirmed_count++;
    else if (m.anomaly) stats.anomaly_count++;
    if (m.failure) stats.failure_count++;
  });
  
  return {
    ok: true,
    measurements,
    stats: Array.from(statsMap.values()),
    meta: {
      country: countryCode || 'all',
      since: since || new Date().toISOString(),
      total: measurements.length,
      filtered: measurements.length,
      source: 'mock',
      note: 'Real OONI data requires internet connection'
    },
  };
}

// Main handler
export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { feed } = req.query;
    
    if (!feed || typeof feed !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing feed parameter. Use: gdelt, news, pubmed, vessels, firms, or ooni' 
      });
    }

    switch (feed) {
      case 'gdelt': {
        const { theme, country, hours = '24' } = req.query;
        const result = await fetchGDELT(
          typeof theme === 'string' ? theme : undefined,
          typeof country === 'string' ? country : undefined,
          parseInt(typeof hours === 'string' ? hours : '24', 10)
        );
        return res.status(200).json(result);
      }
      
      case 'news': {
        const { category = 'geopolitical' } = req.query;
        if (!['geopolitical', 'economic', 'conflict', 'technology'].includes(category as string)) {
          return res.status(400).json({ ok: false, error: 'Invalid category' });
        }
        const result = await fetchNews(category as NewsCategory);
        return res.status(200).json(result);
      }
      
      case 'pubmed': {
        if (req.method !== 'POST') {
          return res.status(405).json({ ok: false, error: 'Method not allowed' });
        }
        const { query } = req.body || {};
        if (!query || typeof query !== 'string') {
          return res.status(400).json({ ok: false, error: 'Missing query in body' });
        }
        const result = await fetchPubMed(query);
        return res.status(200).json(result);
      }
      
      case 'vessels': {
        const { region } = req.query;
        const result = await fetchVessels(typeof region === 'string' ? region : undefined);
        return res.status(200).json(result);
      }
      
      case 'firms': {
        const { region, days = '1' } = req.query;
        const result = await fetchFIRMS(
          typeof region === 'string' ? region : undefined,
          parseInt(typeof days === 'string' ? days : '1', 10)
        );
        return res.status(200).json(result);
      }
      
      case 'ooni': {
        const { country, since } = req.query;
        const result = await fetchOONI(
          typeof country === 'string' ? country : undefined,
          typeof since === 'string' ? since : undefined
        );
        return res.status(200).json(result);
      }
      
      default:
        return res.status(400).json({ 
          ok: false, 
          error: `Unknown feed: ${feed}. Use: gdelt, news, pubmed, vessels, firms, or ooni` 
        });
    }
  } catch (error) {
    console.error('[Intel Feeds Error]', error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
