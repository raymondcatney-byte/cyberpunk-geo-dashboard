import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Filter, MapPinned, Radar, X } from 'lucide-react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type SportType =
  | 'Football'
  | 'Cricket'
  | 'F1'
  | 'MMA'
  | 'Golf'
  | 'Tennis'
  | 'Motorsports'
  | 'Combat'
  | 'Other';
type QualityType = '4K' | '1080p' | '720p' | 'SD' | 'Unknown';

type SportsChannel = {
  name: string;
  sport: SportType;
  language: string[];
  quality: QualityType;
  logo?: string;
  stream_url: string;
  homepage_url?: string;
  tvg_id?: string;
};

type CountrySportsData = {
  code: string;
  name: string;
  flag: string;
  latlng: [number, number];
  channel_count: number;
  channels: SportsChannel[];
  sports_breakdown: Record<string, number>;
  top_sports: string[];
  languages: string[];
};

type GeoResponse = {
  ok: boolean;
  countries?: Record<string, CountrySportsData>;
  global_stats?: {
    total_countries: number;
    total_channels: number;
    sports_distribution: Record<string, number>;
  };
  error?: string;
};

type CheckStatus = 'ok' | 'geo_blocked' | 'offline' | 'timeout' | 'unknown';
type CheckResult = {
  url: string;
  status: CheckStatus;
  httpStatus?: number;
  contentType?: string;
  checkedAt: string;
};

type CheckResponse = {
  ok: boolean;
  checkedFrom?: string;
  regionHint?: string | null;
  results?: CheckResult[];
  error?: string;
};

const SPORT_FILTERS: SportType[] = [
  'Football',
  'Cricket',
  'F1',
  'MMA',
  'Golf',
  'Tennis',
  'Motorsports',
  'Combat',
  'Other',
];

const QUALITY_FILTERS: Array<'All' | QualityType> = ['All', '4K', '1080p', '720p', 'SD', 'Unknown'];

function FlyToCountry({ latlng }: { latlng: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!latlng) return;
    map.flyTo(latlng, 4, { duration: 1.25 });
  }, [latlng, map]);

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function heatColor(value: number, maxValue: number) {
  if (maxValue <= 0) return '#00d4ff';
  const t = clamp(value / maxValue, 0, 1);
  if (t < 0.5) {
    const p = t / 0.5;
    return `rgb(${Math.round(0 + 255 * p)}, ${Math.round(212 - 72 * p)}, ${Math.round(255 - 255 * p)})`;
  }
  const p = (t - 0.5) / 0.5;
  return `rgb(255, ${Math.round(140 - 140 * p)}, ${Math.round(40 * (1 - p))})`;
}

function sportTone(sport: SportType) {
  if (sport === 'Football') return 'text-[#74ff9f]';
  if (sport === 'Cricket') return 'text-[#d7b16d]';
  if (sport === 'F1' || sport === 'Motorsports') return 'text-[#cfd3d8]';
  if (sport === 'MMA' || sport === 'Combat') return 'text-[#ff596a]';
  return 'text-[#a5c4d2]';
}

function statusRank(status: CheckStatus | undefined) {
  if (status === 'ok') return 0;
  if (!status || status === 'unknown') return 1;
  if (status === 'geo_blocked') return 2;
  if (status === 'offline') return 3;
  if (status === 'timeout') return 4;
  return 5;
}

function statusTone(status: CheckStatus | undefined) {
  if (status === 'ok') return 'border-[#6bff8a66] bg-[#6bff8a1a] text-[#b7ffcd]';
  if (status === 'geo_blocked') return 'border-[#ffb84d66] bg-[#ffb84d1a] text-[#ffd6a0]';
  if (status === 'offline') return 'border-[#ff4d6a66] bg-[#ff4d6a1a] text-[#ffc1cb]';
  if (status === 'timeout') return 'border-[#64748b66] bg-[#64748b1a] text-[#cbd5e1]';
  return 'border-[#244658] bg-[#071017] text-[#9bc9da]';
}

function statusLabel(status: CheckStatus | undefined) {
  if (status === 'ok') return 'OK';
  if (status === 'geo_blocked') return 'GEO-BLOCKED';
  if (status === 'offline') return 'OFFLINE';
  if (status === 'timeout') return 'TIMEOUT';
  return 'UNKNOWN';
}

function uniqUrls(urls: string[]) {
  return Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
}

function filterChannels(
  channels: SportsChannel[],
  selectedSports: Set<SportType>,
  quality: 'All' | QualityType,
  language: string,
  countrySport: SportType | 'All'
) {
  return channels.filter((channel) => {
    if (selectedSports.size > 0 && !selectedSports.has(channel.sport)) return false;
    if (quality !== 'All' && channel.quality !== quality) return false;
    if (language !== 'All Languages' && !channel.language.includes(language)) return false;
    if (countrySport !== 'All' && channel.sport !== countrySport) return false;
    return true;
  });
}

export function BroadcastMonitor() {
  const [data, setData] = useState<GeoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSports, setSelectedSports] = useState<Set<SportType>>(new Set());
  const [quality, setQuality] = useState<'All' | QualityType>('All');
  const [language, setLanguage] = useState('All Languages');

  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [countrySportFilter, setCountrySportFilter] = useState<SportType | 'All'>('All');

  const [signalChecking, setSignalChecking] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [checkedFrom, setCheckedFrom] = useState<string | null>(null);
  const [regionHint, setRegionHint] = useState<string | null>(null);
  const [statusByUrl, setStatusByUrl] = useState<Record<string, CheckResult>>({});
  const autoCheckedCountriesRef = useRef<Set<string>>(new Set());
  const autoCheckInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/iptv-sports/geo');
        const payload = (await response.json()) as GeoResponse;
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'UPSTREAM');
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError('SPORTS SIGNAL GRID UNAVAILABLE');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const countries = useMemo(() => Object.values(data?.countries || {}), [data]);

  const languages = useMemo(() => {
    const all = new Set<string>();
    countries.forEach((country) => country.languages.forEach((item) => all.add(item)));
    return ['All Languages', ...Array.from(all).sort((a, b) => a.localeCompare(b))];
  }, [countries]);

  const filteredCountries = useMemo(() => {
    return countries
      .map((country) => {
        const filtered = filterChannels(country.channels, selectedSports, quality, language, 'All');
        const sportsBreakdown = filtered.reduce<Record<string, number>>((acc, channel) => {
          acc[channel.sport] = (acc[channel.sport] || 0) + 1;
          return acc;
        }, {});
        const topSports = Object.entries(sportsBreakdown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([sport]) => sport);

        const languageSet = new Set<string>();
        filtered.forEach((channel) => channel.language.forEach((item) => languageSet.add(item)));

        return {
          ...country,
          channel_count: filtered.length,
          channels: filtered,
          sports_breakdown: sportsBreakdown,
          top_sports: topSports,
          languages: Array.from(languageSet).sort((a, b) => a.localeCompare(b)),
        };
      })
      .filter((country) => country.channel_count > 0);
  }, [countries, language, quality, selectedSports]);

  const countryIndex = useMemo(
    () => new Map(filteredCountries.map((country) => [country.code, country])),
    [filteredCountries]
  );
  const selectedCountry = selectedCountryCode ? countryIndex.get(selectedCountryCode) ?? null : null;

  useEffect(() => {
    setCountrySportFilter('All');
  }, [selectedCountryCode]);

  const rawSidebarChannels = useMemo(() => {
    if (!selectedCountry) return [];
    return filterChannels(selectedCountry.channels, selectedSports, quality, language, countrySportFilter);
  }, [selectedCountry, selectedSports, quality, language, countrySportFilter]);

  const sidebarChannels = useMemo(() => {
    const withStatus = rawSidebarChannels.map((channel) => ({
      channel,
      status: statusByUrl[channel.stream_url]?.status,
    }));

    withStatus.sort((a, b) => {
      const rankDiff = statusRank(a.status) - statusRank(b.status);
      if (rankDiff !== 0) return rankDiff;
      return a.channel.name.localeCompare(b.channel.name);
    });

    return withStatus.map((entry) => entry.channel);
  }, [rawSidebarChannels, statusByUrl]);

  const maxCount = useMemo(
    () => filteredCountries.reduce((max, country) => Math.max(max, country.channel_count), 0),
    [filteredCountries]
  );

  const globalStats = useMemo(() => {
    const totalCountries = filteredCountries.length;
    const totalChannels = filteredCountries.reduce((sum, country) => sum + country.channel_count, 0);
    const distribution = filteredCountries.reduce<Record<string, number>>((acc, country) => {
      Object.entries(country.sports_breakdown).forEach(([sport, count]) => {
        acc[sport] = (acc[sport] || 0) + count;
      });
      return acc;
    }, {});
    return { totalCountries, totalChannels, distribution };
  }, [filteredCountries]);

  async function checkSignals(urls: string[]) {
    const payloadUrls = uniqUrls(urls).slice(0, 25);
    if (payloadUrls.length === 0) return;

    setSignalChecking(true);
    setSignalError(null);

    try {
      const r = await fetch('/api/iptv-sports/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: payloadUrls }),
      });

      const data = (await r.json()) as CheckResponse;
      if (!r.ok || !data.ok) throw new Error(data.error || 'UPSTREAM');

      setCheckedFrom(typeof data.checkedFrom === 'string' ? data.checkedFrom : null);
      setRegionHint(
        typeof data.regionHint === 'string' || data.regionHint === null ? (data.regionHint ?? null) : null
      );

      const results = Array.isArray(data.results) ? data.results : [];
      setStatusByUrl((prev) => {
        const next = { ...prev };
        for (const result of results) {
          if (!result?.url) continue;
          next[result.url] = result;
        }
        return next;
      });
    } catch {
      setSignalError('Signal check failed. Some sources may block probes or rate-limit.');
    } finally {
      setSignalChecking(false);
    }
  }

  useEffect(() => {
    if (!selectedCountry) return;
    if (autoCheckInFlightRef.current) return;
    if (autoCheckedCountriesRef.current.has(selectedCountry.code)) return;

    const urls = selectedCountry.channels.slice(0, 10).map((c) => c.stream_url);
    autoCheckedCountriesRef.current.add(selectedCountry.code);
    autoCheckInFlightRef.current = true;

    void (async () => {
      try {
        await checkSignals(urls);
      } finally {
        autoCheckInFlightRef.current = false;
      }
    })();
  }, [selectedCountryCode]);

  return (
    <div className="min-h-dvh bg-[#0a0a0f] text-white">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="rounded-[24px] border border-[#163246] bg-[radial-gradient(circle_at_top,#0f2332_0%,#0a0a0f_55%)] shadow-[0_0_80px_rgba(0,212,255,0.08)]">
          <div className="border-b border-[#17384f] px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7ddfff]">
                  Broadcast Monitor
                </div>
                <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white">
                  Global Sports Signal Grid
                </h1>
                <p className="mt-2 max-w-4xl text-sm text-[#8ba7b9]">
                  Map-first sports intelligence powered by public streams. Country density reflects inferred
                  broadcast supply.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-2xl border border-[#1b465f] bg-[#0b131a] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#6db9d2]">Countries</div>
                  <div className="mt-1 font-mono text-2xl text-[#d9f7ff]">{globalStats.totalCountries}</div>
                </div>
                <div className="rounded-2xl border border-[#1b465f] bg-[#0b131a] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#6db9d2]">Channels</div>
                  <div className="mt-1 font-mono text-2xl text-[#d9f7ff]">{globalStats.totalChannels}</div>
                </div>
                <div className="rounded-2xl border border-[#1b465f] bg-[#0b131a] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#6db9d2]">Football</div>
                  <div className="mt-1 font-mono text-2xl text-[#74ff9f]">
                    {globalStats.distribution.Football || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#1b465f] bg-[#0b131a] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#6db9d2]">Cricket</div>
                  <div className="mt-1 font-mono text-2xl text-[#d7b16d]">
                    {globalStats.distribution.Cricket || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[#17384f] px-5 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7ddfff]">
                  <Filter className="h-3.5 w-3.5" />
                  Sport Filters
                </div>
                {SPORT_FILTERS.map((sport) => {
                  const active = selectedSports.has(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => {
                        setSelectedCountryCode(null);
                        setSelectedSports((prev) => {
                          const next = new Set(prev);
                          if (next.has(sport)) next.delete(sport);
                          else next.add(sport);
                          return next;
                        });
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-all ${
                        active
                          ? 'border-[#00d4ff] bg-[#00d4ff1f] shadow-[0_0_18px_rgba(0,212,255,0.18)]'
                          : 'border-[#244658] bg-[#081018] hover:border-[#00d4ff66]'
                      } ${sportTone(sport)}`}
                    >
                      {sport}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 lg:grid-cols-[180px_240px_180px]">
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.14em] text-[#6db9d2]">
                  Quality
                  <select
                    value={quality}
                    onChange={(event) => {
                      setSelectedCountryCode(null);
                      setQuality(event.target.value as 'All' | QualityType);
                    }}
                    className="rounded-xl border border-[#214259] bg-[#0a1218] px-3 py-2 text-sm text-white outline-none"
                  >
                    {QUALITY_FILTERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.14em] text-[#6db9d2]">
                  Language
                  <select
                    value={language}
                    onChange={(event) => {
                      setSelectedCountryCode(null);
                      setLanguage(event.target.value);
                    }}
                    className="rounded-xl border border-[#214259] bg-[#0a1218] px-3 py-2 text-sm text-white outline-none"
                  >
                    {languages.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.14em] text-[#6db9d2]">
                  <div>Live Now</div>
                  <div className="flex items-center justify-between rounded-xl border border-[#214259] bg-[#0a1218] px-3 py-2 text-sm text-[#8ba7b9]">
                    <span>EPG pending</span>
                    <span className="text-[10px] uppercase tracking-[0.18em]">Off</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative px-5 py-5">
            <div className="relative overflow-hidden rounded-[28px] border border-[#1a3b4f] bg-[#071017]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,255,0.12),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(255,74,74,0.1),transparent_36%)]" />
              <div className="relative h-[72vh] min-h-[560px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-[#8ba7b9]">
                    <div className="rounded-2xl border border-[#1a3b4f] bg-[#0b131a] px-5 py-4 font-mono uppercase tracking-[0.18em]">
                      Ingesting global sports signals...
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="max-w-lg rounded-2xl border border-[#5a1d2b] bg-[#180b10] px-5 py-4 text-center">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff8d98]">Alert</div>
                      <div className="mt-2 text-lg font-bold text-white">{error}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <MapContainer
                      center={[20, 0]}
                      zoom={2}
                      minZoom={2}
                      scrollWheelZoom
                      className="h-full w-full"
                      zoomControl={false}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                      <FlyToCountry latlng={selectedCountry ? selectedCountry.latlng : null} />

                      {filteredCountries.map((country) => {
                        const color = heatColor(country.channel_count, maxCount);
                        const radius = 5 + (country.channel_count / Math.max(maxCount, 1)) * 18;

                        return (
                          <CircleMarker
                            key={country.code}
                            center={country.latlng}
                            radius={radius}
                            pathOptions={{
                              color,
                              fillColor: color,
                              fillOpacity: 0.56,
                              weight: selectedCountryCode === country.code ? 2.5 : 1,
                            }}
                            eventHandlers={{ click: () => setSelectedCountryCode(country.code) }}
                          >
                            <Tooltip direction="top" offset={[0, -4]}>
                              <div className="min-w-[170px] font-mono text-[11px]">
                                <div className="font-bold text-white">
                                  {country.flag} {country.name}
                                </div>
                                <div className="mt-1 text-[#9bc9da]">Channels: {country.channel_count}</div>
                                <div className="text-[#9bc9da]">Top: {country.top_sports.join(', ') || 'Other'}</div>
                              </div>
                            </Tooltip>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>

                    <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-[#1a3b4f] bg-[#081018cc] px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7ddfff]">
                        <Radar className="h-3.5 w-3.5" />
                        Orbital Sports Coverage
                      </div>
                      <div className="mt-2 max-w-xs text-sm text-[#a9c5d4]">
                        Click a country node to zoom and load broadcast channels. Density increases from electric blue to hot orange.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <aside
              className={`absolute right-8 top-8 z-[500] h-[calc(100%-4rem)] w-[min(420px,calc(100%-4rem))] rounded-[28px] border border-[#1a3b4f] bg-[#091018e8] shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 ${
                selectedCountry ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'
              }`}
            >
              {selectedCountry && (
                <div className="flex h-full flex-col">
                  <div className="border-b border-[#17384f] px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#7ddfff]">Country Dossier</div>
                        <div className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white">
                          {selectedCountry.flag} {selectedCountry.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCountryCode(null)}
                        className="rounded-full border border-[#244658] bg-[#0a1218] p-2 text-[#8ba7b9] hover:border-[#00d4ff66] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-[#1a3b4f] bg-[#0b131a] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#6db9d2]">Total</div>
                        <div className="mt-1 font-mono text-xl text-white">{selectedCountry.channel_count}</div>
                      </div>
                      <div className="rounded-2xl border border-[#1a3b4f] bg-[#0b131a] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#6db9d2]">Top Sport</div>
                        <div className="mt-1 font-mono text-xl text-white">{selectedCountry.top_sports[0] || 'Other'}</div>
                      </div>
                      <div className="rounded-2xl border border-[#1a3b4f] bg-[#0b131a] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#6db9d2]">Languages</div>
                        <div className="mt-1 font-mono text-xl text-white">{selectedCountry.languages.length}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCountrySportFilter('All')}
                        className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${
                          countrySportFilter === 'All'
                            ? 'border-[#00d4ff] bg-[#00d4ff1f] text-white'
                            : 'border-[#244658] bg-[#081018] text-[#8ba7b9]'
                        }`}
                      >
                        All
                      </button>
                      {Object.keys(selectedCountry.sports_breakdown).map((sport) => (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => setCountrySportFilter(sport as SportType)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${
                            countrySportFilter === sport
                              ? 'border-[#00d4ff] bg-[#00d4ff1f] text-white'
                              : 'border-[#244658] bg-[#081018] text-[#8ba7b9]'
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[#7ddfff]">
                      <span>Channel List</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#9bc9da]">{sidebarChannels.length}</span>
                        <button
                          type="button"
                          disabled={signalChecking}
                          onClick={() => checkSignals(sidebarChannels.slice(0, 20).map((c) => c.stream_url))}
                          className={`rounded-xl border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                            signalChecking
                              ? 'border-[#244658] bg-[#081018] text-[#64748b]'
                              : 'border-[#00d4ff66] bg-[#00d4ff1a] text-[#c9f7ff] hover:bg-[#00d4ff2b]'
                          }`}
                        >
                          {signalChecking ? 'Checking…' : 'Check signals'}
                        </button>
                      </div>
                    </div>
                    <div className="mb-3 text-xs text-[#8ba7b9]">
                      {signalError ? (
                        <span className="text-[#ff8d98]">{signalError}</span>
                      ) : (
                        <span>
                          Checked from Vercel, not your ISP
                          {checkedFrom ? ` (${checkedFrom}` : ''}
                          {regionHint ? `:${regionHint}` : checkedFrom ? ')' : ''}
                          .
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {sidebarChannels.map((channel, index) => {
                        const status = statusByUrl[channel.stream_url]?.status;
                        return (
                        <div
                          key={`${channel.stream_url}-${index}`}
                          className="rounded-2xl border border-[#1a3b4f] bg-[#0b131a] px-3 py-3"
                          style={{ animation: `channel-cascade 320ms ease-out ${index * 35}ms both` }}
                        >
                          <div className="flex items-start gap-3">
                            {channel.logo ? (
                              <img
                                src={channel.logo}
                                alt=""
                                className="h-10 w-10 rounded-xl border border-[#244658] bg-[#071017] object-contain p-1"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#244658] bg-[#071017] text-[#7ddfff]">
                                <MapPinned className="h-4 w-4" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate font-mono text-sm text-white">{channel.name}</div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <div
                                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${statusTone(
                                      status
                                    )}`}
                                    title={
                                      status === 'geo_blocked'
                                        ? 'Likely blocked by upstream region policy'
                                        : undefined
                                    }
                                  >
                                    {statusLabel(status)}
                                  </div>
                                  <div className="rounded-full border border-[#244658] bg-[#071017] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[#9bc9da]">
                                    {channel.quality}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-[#8ba7b9]">
                                <span className="rounded-full border border-[#244658] bg-[#071017] px-2 py-0.5">
                                  {channel.sport}
                                </span>
                                <span className="rounded-full border border-[#244658] bg-[#071017] px-2 py-0.5">
                                  {channel.language.join('/') || 'Unknown'}
                                </span>
                              </div>

                              <div className="mt-3 flex gap-2">
                                {channel.homepage_url && (
                                  <a
                                    href={channel.homepage_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#00d4ff66] bg-[#00d4ff1a] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#c9f7ff] hover:bg-[#00d4ff2b]"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" /> Source
                                  </a>
                                )}
                                <a
                                  href={channel.stream_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-[#ff8a3d66] bg-[#ff8a3d1a] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#ffd0ae] hover:bg-[#ff8a3d2b]"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Try Stream
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-container { background: #05070b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .leaflet-tooltip { background: rgba(8, 16, 24, 0.94); border: 1px solid rgba(0, 212, 255, 0.25); color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35); }
        .leaflet-tooltip-top:before { border-top-color: rgba(0, 212, 255, 0.2); }
        @keyframes channel-cascade { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}