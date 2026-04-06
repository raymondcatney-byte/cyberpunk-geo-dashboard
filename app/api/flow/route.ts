import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Initialize Redis client lazily
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      console.warn('[API/Flow] Redis not configured');
      return null;
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const minSeverity = searchParams.get('minSeverity') || 'NOTABLE';
  const category = searchParams.get('category');

  const r = getRedis();
  
  if (!r) {
    return Response.json({
      alerts: [],
      count: 0,
      lastUpdated: Date.now(),
      categories: [],
      error: 'Flow detection not configured'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60'
      }
    });
  }

  try {
    const alertsData = await r.zrange('pm:flow:alerts', -limit, -1, { rev: true });
    let alerts = alertsData.map((a: string) => JSON.parse(a));

    const severityOrder = { NOTABLE: 0, UNUSUAL: 1, SUSPICIOUS: 2, WHALE_ALERT: 3 };
    const minLevel = severityOrder[minSeverity as keyof typeof severityOrder] || 0;
    
    alerts = alerts.filter((a: any) => 
      severityOrder[a.severity as keyof typeof severityOrder] >= minLevel
    );

    if (category) {
      alerts = alerts.filter((a: any) => 
        a.category?.toLowerCase() === category.toLowerCase()
      );
    }

    const now = Date.now();
    alerts = alerts.filter((a: any) => a.expiresAt > now);

    return Response.json({
      alerts,
      count: alerts.length,
      lastUpdated: Date.now(),
      categories: [...new Set(alerts.map((a: any) => a.category))]
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('[API/Flow] Failed to fetch alerts:', error);
    return Response.json({ 
      alerts: [],
      count: 0,
      lastUpdated: Date.now(),
      categories: [],
      error: 'Failed to fetch alerts'
    }, { status: 500 });
  }
}
