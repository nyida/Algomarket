import { NextResponse } from 'next/server';

export function whaleError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('no such file') || message.includes('fileMustExist')) {
    return NextResponse.json(
      { error: 'Database not found. Set WHALE_DB_PATH or run the scraper first.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: message }, { status });
}

export function whaleJson<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
