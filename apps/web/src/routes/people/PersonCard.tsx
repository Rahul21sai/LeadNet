import { useId, useState, type Ref } from 'react';
import { Check, Clock3, MapPin, UserPlus, UserRound } from 'lucide-react';
import { connectionActionAllowed, connectionRecordFromView, type ConnectionAction, type ConnectionPerson, type ConnectionView } from '@leadnet/shared';
import { formatDateTime, timeAgo } from '../../lib/format.ts';
import { connectionCardState } from './presentation.ts';

interface Props {
  person: ConnectionPerson;
  request?: ConnectionView;
  ownProfileId: string;
  canSend: boolean;
  busy: boolean;
  now: number;
  selected?: boolean;
  compact?: boolean;
  cardRef?: Ref<HTMLLIElement>;
  onSend: (peerId: string) => Promise<boolean>;
  onAction: (request: ConnectionView, action: ConnectionAction) => Promise<boolean>;
  onJoin: () => void;
}

export function PersonCard({ person, request, ownProfileId, canSend, busy, now, selected = false, compact = false, cardRef, onSend, onAction, onJoin }: Props) {
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const confirmationId = useId();
  const state = connectionCardState(request, ownProfileId, canSend, now);
  const allowed = (action: ConnectionAction) => Boolean(request && connectionActionAllowed(connectionRecordFromView(request, ownProfileId), ownProfileId, action));
  const act = (action: ConnectionAction) => { if (request && allowed(action)) void onAction(request, action); };

  return <li ref={cardRef} tabIndex={selected ? -1 : undefined} className={`people-person ${compact ? 'people-person-compact' : ''}`} data-selected={selected || undefined}>
    <div className="people-person-main">
      <span className="people-avatar" aria-hidden="true"><UserRound size={compact ? 19 : 24} strokeWidth={1.35} /></span>
      <div className="people-person-copy">
        <div className="people-person-title"><h3>Citizen</h3>{person.isDemo && <span className="people-demo-label">Fictional example</span>}</div>
        <p className="people-person-ward"><MapPin size={12} aria-hidden="true" />{person.ward.name}</p>
        <p className="people-person-bio">{person.bio || 'No bio shared.'}</p>
        {selected && <p className="people-selected-note">Profile opened from the creator directory.</p>}
        {request && compact && <p className="people-request-time"><time dateTime={new Date(request.updatedAt).toISOString()} title={formatDateTime(request.updatedAt)}>{request.status === 'accepted' ? 'Connected' : request.direction === 'incoming' ? 'Received' : 'Requested'} {timeAgo(request.updatedAt, now)}</time></p>}
      </div>
    </div>
    <div className="people-person-controls">
      {state.kind === 'connect' && <button type="button" className="people-button people-button-accent" onClick={() => void onSend(person.id)} disabled={busy}><UserPlus size={15} aria-hidden="true" />Connect</button>}
      {state.kind === 'join' && <><button type="button" className="people-button people-button-secondary" disabled title="Enable your People profile to send a request"><UserPlus size={15} aria-hidden="true" />Connect</button><button type="button" className="people-text-button" onClick={onJoin} disabled={busy}>Enable discovery</button></>}
      {state.kind === 'requested' && <><span className="people-relationship"><Clock3 size={14} aria-hidden="true" />Requested</span>{allowed('cancel') && <button type="button" className="people-text-button" disabled={busy} onClick={() => act('cancel')}>Cancel request</button>}</>}
      {state.kind === 'incoming' && <><span className="people-relationship">Wants to connect</span><div className="people-action-pair">{allowed('accept') && <button type="button" className="people-button people-button-accent" disabled={busy} onClick={() => act('accept')}>Accept</button>}{allowed('decline') && <button type="button" className="people-button people-button-secondary" disabled={busy} onClick={() => act('decline')}>Decline</button>}</div></>}
      {state.kind === 'connected' && <><span className="people-relationship"><Check size={15} aria-hidden="true" />Connected</span>{allowed('remove') && <button type="button" className="people-text-button" disabled={busy} onClick={() => setConfirmingRemoval(true)} aria-expanded={confirmingRemoval} aria-controls={confirmationId}>Remove connection</button>}</>}
      {state.kind === 'cooldown' && <><span className="people-relationship"><Clock3 size={14} aria-hidden="true" />Try again later</span>{state.retryAt && <span className="people-cooldown">Available {formatDateTime(state.retryAt)}</span>}</>}
    </div>
    {confirmingRemoval && request && state.kind === 'connected' && <div id={confirmationId} className="people-remove-confirm" role="group" aria-label="Confirm connection removal"><p><strong>Remove this connection?</strong> New requests between you will be paused for 24 hours. Existing civic records stay public.</p><div className="people-action-pair"><button type="button" className="people-button people-button-danger" disabled={busy} onClick={() => { void onAction(request, 'remove').then((removed) => { if (removed) setConfirmingRemoval(false); }); }}>Remove connection</button><button type="button" className="people-button people-button-secondary" disabled={busy} onClick={() => setConfirmingRemoval(false)}>Keep connection</button></div></div>}
  </li>;
}
