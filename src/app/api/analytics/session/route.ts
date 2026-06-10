import { NextRequest, NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'query_analytics.py');
    const result = spawnSync('python3', [scriptPath, '--session-id', id], {
      encoding: 'utf-8',
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || 'Unknown error');
    const data = JSON.parse(result.stdout);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
