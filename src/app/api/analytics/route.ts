import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'query_analytics.py');
    const filters: Record<string, any> = {};

    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days');
    if (days) {
      filters['days'] = parseInt(days, 10);
    }
    const model = searchParams.get('model');
    if (model) {
      filters['model'] = model;
    }

    const filtersJson = JSON.stringify(filters);
    const output = execSync(`python3 ${scriptPath} '${filtersJson.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
    });

    const data = JSON.parse(output);
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
