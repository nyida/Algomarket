import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const DEFAULT_KEY = 'algomarket-dev-key';

export function getApiKey(): string {
  return process.env.ALGOMARKET_API_KEY ?? process.env.ARBWHALE_API_KEY ?? DEFAULT_KEY;
}

export function checkApiKey(req: NextRequest): boolean {
  const provided = req.headers.get('x-api-key') ?? req.nextUrl.searchParams.get('api_key');
  return provided === getApiKey();
}

export function apiUnauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized. Pass x-api-key header or ?api_key= query param.' },
    { status: 401 },
  );
}
