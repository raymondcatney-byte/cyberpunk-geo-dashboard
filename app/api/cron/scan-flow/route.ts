import { detector } from '../../../../lib/unusual-flow/detector';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const startTime = Date.now();
    const signals = await detector.scanAllMarkets();
    const duration = Date.now() - startTime;

    return Response.json({
      success: true,
      marketsScanned: 100,
      alertsGenerated: signals.length,
      topAlerts: signals.slice(0, 5).map(s => ({
        type: s.type,
        severity: s.severity,
        market: s.marketQuestion.substring(0, 50) + '...',
        size: s.activity.size
      })),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API/Cron/ScanFlow] Scan failed:', error);
    return Response.json({ 
      error: 'Scan failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
