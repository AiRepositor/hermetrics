import { NextRequest, NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'query_analytics.py');
    const filters: Record<string, any> = {};

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days');
    if (days) {
      const parsed = parseInt(days, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: `Invalid 'days' parameter: ${days} (must be a positive integer)` },
          { status: 400 }
        );
      }
      filters['days'] = parsed;
    }
    const model = searchParams.get('model');
    if (model) {
      filters['model'] = model;
    }

    const filtersJson = JSON.stringify(filters);
    // No shell: filters (incl. the user-supplied model name) are passed as a plain argv entry.
    const output = execFileSync('python3', [scriptPath, filtersJson], {
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 20 * 1024 * 1024,
    });

    const data = JSON.parse(output);
    const response = NextResponse.json(data);
    // Live data: a cached response would make Refresh show stale numbers for up to a minute.
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
