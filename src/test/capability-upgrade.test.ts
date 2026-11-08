import { describe, expect, it, vi } from 'vitest';
import { monitorPreview, selectedItems, parseResponses } from '@/lib/claims/capability-upgrade';
import { McpHttpClient } from '@/lib/claims/mcp-client.server';

describe('focused capability contracts', () => {
  it('batches only one or two selected unresolved IDs, never routine items', () => {
    expect(selectedItems('UC02', ['bumper-guidance']).map(x => x.id)).toEqual(['bumper-guidance']);
    expect(() => selectedItems('UC02', ['routine-line'])).toThrow();
    expect(() => selectedItems('UC01', [])).toThrow();
    expect(() => selectedItems('UC01', ['auction-status', 'sale-access', 'auction-status'])).toThrow();
  });
  it('retains actual response IDs, annotations, trail and structured nulls', () => {
    const annotation = { type: 'url_citation', url: 'https://example.org', start_index: 0, end_index: 4 };
    const parsed = parseResponses({id:'resp-real',output:[{type:'web_search_call',id:'search-real'},{type:'message',content:[{type:'output_text',text:'{"rate":null}',annotations:[annotation]}]}]});
    expect(parsed.id).toBe('resp-real'); expect(parsed.structured.rate).toBeNull();
    expect(parsed.annotations).toEqual([annotation]); expect(parsed.research_trail[0].id).toBe('search-real');
    expect(parsed.annotations[0]).not.toHaveProperty('excerpt');
  });
  it('builds preview bodies without any network call and no fictitious Task ID', () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    expect(monitorPreview('exact missing report').body.settings).toEqual({query:'exact missing report',include_backfill:false});
    expect(monitorPreview('unused','real-task').body.settings).toEqual({task_run_id:'real-task'});
    expect(fetcher).not.toHaveBeenCalled(); fetcher.mockRestore();
  });
  it('matches JSON-RPC IDs, CRLF SSE and retains negotiated headers', async () => {
    const seen: Headers[] = [];
    const fetcher = vi.spyOn(globalThis,'fetch').mockImplementation(async (_url, init) => {
      const request = JSON.parse(String(init?.body)); seen.push(new Headers(init?.headers));
      if (request.method === 'notifications/initialized') return new Response(null,{status:202});
      const result = request.method === 'initialize' ? {protocolVersion:'2025-06-18'} : {tools:[]};
      return new Response(`data: ${JSON.stringify({id:999,result:{wrong:true}})}\r\n\r\ndata: ${JSON.stringify({id:request.id,result})}\r\n\r\n`,{headers:{'content-type':'text/event-stream','mcp-session-id':'session-real'}});
    });
    const client = new McpHttpClient('https://example.org/mcp',{}); await client.initialize();
    expect(await client.listTools()).toEqual({tools:[]});
    expect(seen[2]?.get('mcp-session-id')).toBe('session-real');
    expect(seen[2]?.get('mcp-protocol-version')).toBe('2025-06-18'); fetcher.mockRestore();
  });
});