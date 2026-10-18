import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Eye, EyeOff, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import type { ConnectionProfile, ConnectionProfileInput, WardDoc } from '@leadnet/shared';

interface Props {
  profile: ConnectionProfile | null;
  wards: readonly WardDoc[];
  selectedWardId: string;
  busy: boolean;
  isDemo: boolean;
  sectionRef: RefObject<HTMLElement | null>;
  onSave: (input: ConnectionProfileInput) => Promise<boolean>;
}

export function ProfileEditor({ profile, wards, selectedWardId, busy, isDemo, sectionRef, onSave }: Props) {
  const id = useId();
  const [wardId, setWardId] = useState(profile?.ward.id ?? selectedWardId);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [discoverable, setDiscoverable] = useState(profile?.discoverable ?? false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const currentWard = wardId || selectedWardId;
  const validWard = wards.some((ward) => ward.id === currentWard);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || lock.current || !validWard || (!profile && !discoverable)) return;
    lock.current = true; setSaving(true);
    try { await onSave({ wardId: currentWard, bio: bio.trim(), discoverable }); }
    finally { lock.current = false; setSaving(false); }
  }

  return <section ref={sectionRef} tabIndex={-1} className="people-profile" aria-labelledby={`${id}-heading`}>
    <div className="people-section-label"><UserRound size={15} aria-hidden="true" />Your place in People</div>
    <div className="people-profile-heading"><h2 id={`${id}-heading`}>{profile ? 'Your Citizen profile.' : 'A neighbour, by choice.'}</h2><span className={`people-discovery-status ${profile?.discoverable ? 'is-visible' : ''}`}>{profile?.discoverable ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}{profile?.discoverable ? 'Discoverable' : 'Hidden'}</span></div>
    <p className="people-profile-intro">{profile ? 'You control whether neighbours can find you.' : 'Enable your profile to send requests and appear in your ward’s directory.'} Everyone appears as Citizen.</p>
    <form onSubmit={(event) => void save(event)} className="people-profile-form">
      <label htmlFor={`${id}-ward`}>Your ward</label>
      <div className="people-select"><MapPin size={15} aria-hidden="true" /><select id={`${id}-ward`} value={validWard ? currentWard : ''} onChange={(event) => setWardId(event.target.value)} disabled={busy || saving || !wards.length} required><option value="" disabled>Choose a ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name.en}</option>)}</select></div>
      <div className="people-bio-label"><label htmlFor={`${id}-bio`}>A little about your local interests <span>(optional)</span></label><span id={`${id}-count`}>{bio.length}/160</span></div>
      <textarea id={`${id}-bio`} value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} placeholder="Better footpaths, weekend clean-ups, greener streets…" aria-describedby={`${id}-privacy ${id}-count`} disabled={busy || saving} />
      <p id={`${id}-privacy`} className="people-field-help">Keep names, phone numbers, email and exact addresses out. Only your ward and bio can appear publicly.</p>
      <label className="people-consent" htmlFor={`${id}-discovery`}><input id={`${id}-discovery`} type="checkbox" checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} disabled={busy || saving} aria-describedby={`${id}-consent-help`} /><span>Let citizens in my ward discover my profile</span></label>
      <p id={`${id}-consent-help`} className="people-field-help">{isDemo ? 'This demo choice stays in your browser. ' : ''}Turning this off hides your profile from discovery and stops new requests. Existing participants retain the profile details shared with their request.</p>
      <button className="people-button people-button-primary people-profile-save" type="submit" disabled={busy || saving || !validWard || (!profile && !discoverable)}>{saving ? 'Saving…' : profile ? 'Save profile' : 'Join People'}</button>
      <p className="people-profile-private"><ShieldCheck size={13} aria-hidden="true" />{isDemo ? 'Fictional people. Your choices stay here.' : 'Requests are visible only to participants.'}</p>
    </form>
  </section>;
}
