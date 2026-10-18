import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ConnectionPerson, ConnectionView } from '@leadnet/shared';
import { PersonCard } from '../src/routes/people/PersonCard.tsx';

const peer: ConnectionPerson = { id: 'opaque-profile-private-value', authorLabel: 'Citizen', ward: { id: 'ward-1', name: 'Jayanagar' }, bio: 'Safer footpaths for our neighbourhood.', isDemo: true };
const relation = (status: ConnectionView['status'], direction: ConnectionView['direction']): ConnectionView => ({ id: 'private-pair-id', peer, status, direction, createdAt: 1, updatedAt: 1, revision: 1, isDemo: true });
const render = (request?: ConnectionView, canSend = true, busy = false) => renderToStaticMarkup(createElement(PersonCard, {
  person: peer, request, ownProfileId: 'self', canSend, busy, now: 100,
  onSend: async () => true, onAction: async () => true, onJoin: () => {},
}));

describe('Citizen connection card markup', () => {
  it('renders public anonymous information and fictional provenance without publishing identities or photos', () => {
    const html = render();
    expect(html).toContain('Citizen');
    expect(html).toContain('Jayanagar');
    expect(html).toContain(peer.bio);
    expect(html).toContain('Fictional example');
    expect(html).not.toContain(peer.id);
    expect(html).not.toContain('<img');
  });

  it('shows recipient consent controls only for incoming pending requests', () => {
    const incoming = render(relation('pending', 'incoming'), false);
    expect(incoming).toContain('>Accept</button>');
    expect(incoming).toContain('>Decline</button>');
    expect(incoming).not.toContain('Cancel request');
    const outgoing = render(relation('pending', 'outgoing'));
    expect(outgoing).toContain('Requested');
    expect(outgoing).toContain('Cancel request');
    expect(outgoing).not.toContain('>Accept</button>');
  });

  it('shows an accepted connection with removal disclosure and no accidental send control', () => {
    const html = render(relation('accepted', 'incoming'), false);
    expect(html).toContain('Connected');
    expect(html).toContain('Remove connection');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('>Connect</button>');
    expect(html).not.toContain('Confirm connection removal');
  });

  it('disables new sends until discovery consent and gives a route to profile settings', () => {
    const html = render(undefined, false);
    expect(html).toContain('disabled=""');
    expect(html).toContain('Enable discovery');
    expect(html).not.toContain('>Accept</button>');
    expect(render(undefined, true, true)).toContain('disabled=""');
  });

  it('presents cooldown information without a send control', () => {
    const html = render(relation('declined', 'incoming'));
    expect(html).toContain('Try again later');
    expect(html).toContain('Available');
    expect(html).not.toContain('>Connect</button>');
    expect(html).not.toContain('private-pair-id');
  });
});
