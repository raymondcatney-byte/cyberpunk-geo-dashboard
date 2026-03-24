export interface LivestreamConfig {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  videoId: string;
}

export const LIVESTREAMS: LivestreamConfig[] = [
  // Middle East
  {
    id: 'jerusalem',
    city: 'Jerusalem',
    country: 'Israel',
    lat: 31.7683,
    lng: 35.2137,
    videoId: '77akujLn4k8',
  },

  // Europe
  {
    id: 'kyiv',
    city: 'Kyiv',
    country: 'Ukraine',
    lat: 50.4501,
    lng: 30.5234,
    videoId: 'e2gC37ILQmk',
  },
  {
    id: 'paris',
    city: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    videoId: 'OzYp4NRZlwQ',
  },
  {
    id: 'london',
    city: 'London',
    country: 'UK',
    lat: 51.5074,
    lng: -0.1278,
    videoId: 'WKGK_hYnlGE',
  },
  {
    id: 'stpetersburg',
    city: 'St. Petersburg',
    country: 'Russia',
    lat: 59.9311,
    lng: 30.3609,
    videoId: 'fUsJZTHeZn4',
  },

  // North America
  {
    id: 'nyc',
    city: 'New York',
    country: 'USA',
    lat: 40.7128,
    lng: -74.006,
    videoId: 'rnXIjl_Rzy4',
  },
  {
    id: 'dc',
    city: 'Washington DC',
    country: 'USA',
    lat: 38.9072,
    lng: -77.0369,
    videoId: '1wV9lLe14aU',
  },
  {
    id: 'la',
    city: 'Los Angeles',
    country: 'USA',
    lat: 34.0522,
    lng: -118.2437,
    videoId: 'EO_1LWqsCNE',
  },

  // Asia
  {
    id: 'taipei',
    city: 'Taipei',
    country: 'Taiwan',
    lat: 25.033,
    lng: 121.5654,
    videoId: 'z_fY1pj1VBw',
  },
  {
    id: 'shanghai',
    city: 'Shanghai',
    country: 'China',
    lat: 31.2304,
    lng: 121.4737,
    videoId: 'n5cW4FpGvhI',
  },
  {
    id: 'seoul',
    city: 'Seoul',
    country: 'South Korea',
    lat: 37.5665,
    lng: 126.978,
    videoId: 'DSgn-lTHJzM',
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    videoId: 'gCu45mPX77Y',
  },
];

export function getLivestreamById(id: string): LivestreamConfig | undefined {
  return LIVESTREAMS.find((stream) => stream.id === id);
}
