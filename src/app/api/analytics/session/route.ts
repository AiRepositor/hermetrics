import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'query_analytics.py');
    const output = execSync(`python3 ${scriptPath} --session-id '${id.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8', timeout: 5000,
    });
    return NextResponse.json(JSON.parse(output));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
