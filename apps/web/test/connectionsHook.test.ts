import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WardDoc } from '@leadnet/shared';
import { CONNECTION_DEMO_KEY, parseConnectionDemo, saveDemoConnectionProfile, emptyConnectionDemo } from '../src/lib/connectionsDemo.ts';

const state = vi.hoisted(() => ({ read: vi.fn(), post: vi.fn() }));
vi.mock('../src/lib/demo.ts', () => ({ isOfflineDemo: true, readDemo: state.read }));
vi.mock('../src/lib/auth.ts', () => ({ useSession: () => ({ ready: true, user: null, role: 'citizen', wardIds: [], authEpoch: 1 }) }));
vi.mock('../src/lib/api.ts', () => ({ api: { post: state.post, get: vi.fn() } }));
import { useConnections } from '../src/lib/connections.ts';

const ward = { id: 'ward-a', name: { en: 'First ward', kn: 'ವಾರ್ಡ್' } } as WardDoc;
const otherWard = { ...ward, id: 'ward-b', name: { en: 'Second ward', kn: 'ವಾರ್ಡ್' } };

function harness() {
  let hook!: ReturnType<typeof useConnections>;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(['connections-demo-ward', ward.id], ward);
  function Capture() { hook = useConnections(ward.id); return null; }
  renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(Capture)));
  return { hook, client };
}

describe('connection hook demo integration without a browser', () => {
  let saved: Map<string, string>;
  beforeEach(() => {
    saved = new Map(); state.read.mockReset(); state.post.mockReset();
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('saves a profile in its independently selected ward without calling the connected API', async () => {
    state.read.mockResolvedValue(otherWard);
    const { hook, client } = harness();
    await hook.saveProfile({ wardId: otherWard.id, bio: 'Local parks', discoverable: true });
    expect(state.read).toHaveBeenCalledWith(`wards/${otherWard.id}`, []);
    expect(parseConnectionDemo(saved.get(CONNECTION_DEMO_KEY) ?? null).profile?.ward.id).toBe(otherWard.id);
    expect(state.post).not.toHaveBeenCalled(); client.clear();
  });

  it('rejects failed refreshes instead of reporting a successful reload', async () => {
    state.read.mockRejectedValue(new Error('Ward records unavailable'));
    const { hook, client } = harness();
    await expect(hook.refresh()).rejects.toThrow('Ward records unavailable');
    expect(state.post).not.toHaveBeenCalled(); client.clear();
  });

  it('does not persist a confirmed connection when site storage rejects the action', async () => {
    const initial = saveDemoConnectionProfile(emptyConnectionDemo(), { wardId: ward.id, bio: '', discoverable: true }, ward, 100);
    saved.set(CONNECTION_DEMO_KEY, JSON.stringify(initial));
    const { hook, client } = harness();
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: () => { throw new Error('Storage quota'); } });
    await expect(hook.act(initial.records[0]!.id, 'accept', 1)).rejects.toThrow('Storage quota');
    expect(parseConnectionDemo(saved.get(CONNECTION_DEMO_KEY) ?? null).records[0]?.status).toBe('pending');
    expect(state.post).not.toHaveBeenCalled(); client.clear();
  });
});
