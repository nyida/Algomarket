import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClientError, apiFetch, resetRateLimits } from './http';
import { mockPredScopeMarkets, mockCoinPaprikaBtc } from './__mocks__/responses';

describe('apiFetch', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await apiFetch<{ ok: boolean }>({
      source: 'test',
      baseUrl: 'https://example.com',
      path: '/data',
      throwOnError: true,
    });

    expect(result.ok).toBe(true);
  });

  it('returns null on HTTP error (graceful degradation)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const result = await apiFetch({
      source: 'test',
      baseUrl: 'https://example.com',
      path: '/missing',
    });

    expect(result).toBeNull();
  });

  it('throws ApiClientError when throwOnError is true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Error', { status: 500 }));

    await expect(
      apiFetch({
        source: 'test',
        baseUrl: 'https://example.com',
        path: '/fail',
        throwOnError: true,
      }),
    ).rejects.toBeInstanceOf(ApiClientError);
  });

  it('includes API key in header when configured', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await apiFetch({
      source: 'test',
      baseUrl: 'https://example.com',
      path: '/secure',
      apiKey: 'test-key-123',
      throwOnError: true,
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/secure',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-key-123' }),
      }),
    );
  });
});

describe('mock responses', () => {
  it('predscope mock has valid structure', () => {
    expect(mockPredScopeMarkets.markets[0].outcomes[0].probability).toBeGreaterThan(0);
  });

  it('coinpaprika mock has USD quote', () => {
    expect(mockCoinPaprikaBtc.quotes.USD.price).toBe(60000);
  });
});
