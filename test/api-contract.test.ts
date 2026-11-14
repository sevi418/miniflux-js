import { afterEach, describe, expect, it, vi } from 'vitest'
import { MinifluxClient } from '../src/index.ts'

describe('API contracts', () => {
  const client = new MinifluxClient({ baseURL: 'https://example.com', apiKey: 'secret' })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the current version endpoint and preserves the string result', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: '2.3.2' }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await expect(client.getVersion()).resolves.toBe('2.3.2')
    expect(fetch.mock.calls[0][0]).toBe('https://example.com/v1/version')
    expect(fetch.mock.calls[0][1].headers.get('X-Auth-Token')).toBe('secret')
  })

  it('updates entry status through the bulk endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await client.updateEntryStatus(42, 'read')
    expect(fetch.mock.calls[0][0]).toBe('https://example.com/v1/entries')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ entry_ids: [42], status: 'read' })
  })

  it('encodes searches and ID filters correctly, including false and zero', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetch)
    await client.searchEntries('a & b', 0)
    expect(fetch.mock.calls[0][0]).toBe('https://example.com/v1/entries?search=a+%26+b&limit=0')
    await client.getEntryIds({ starred: false, offset: 0 })
    expect(fetch.mock.calls[1][0]).toBe('https://example.com/v1/entries/ids?starred=false&offset=0')
  })

  it('returns the feed ID supplied by the server', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"feed_id":42}', { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    await expect(client.createFeed('https://example.com/rss', 1)).resolves.toEqual({ feed_id: 42 })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ feed_url: 'https://example.com/rss', category_id: 1 })
  })
})
