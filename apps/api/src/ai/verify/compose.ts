import { z } from 'zod';
import { extractNumbers, type VerifierCheck } from '@leadnet/shared';

export const zComposition = z.object({ transcript: z.string().trim().min(1).max(2400).nullable(), post: z.string().trim().max(1600) }).strict();
export type Composition = z.infer<typeof zComposition>;
const stop = new Set('a an the this that is are was were it its i we they to of on in at and or for with from please there has have had be been as by my our can could would should about issue'.split(' '));
const numbers = (value: string) => [...new Set(extractNumbers(value))].sort((a, b) => a - b).join('|');

export function composeChecks(value: Composition, original: string, hasAudio: boolean, hasPhoto = false): VerifierCheck[] {
  const source = [original, value.transcript ?? ''].join(' ').trim();
  const meaningful = source.toLocaleLowerCase().match(/[\p{L}]{3,}/gu)?.filter((word) => !stop.has(word)) ?? [];
  const rewritten = value.post.toLocaleLowerCase();
  const retained = meaningful.filter((word) => rewritten.includes(word));
  const script = (text: string) => /[\u0c80-\u0cff]/u.test(text) ? 'kn' : /[\u0900-\u097f]/u.test(text) ? 'hi' : 'en';
  const translated = script(source) !== script(value.post);
  const addedClaims = ['verified', 'resolved', 'repaired', 'corrupt', 'negligent', 'injured', 'died', 'guaranteed'].filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(value.post) && !new RegExp(`\\b${word}\\b`, 'i').test(source));
  const negative = /\b(no|not|never|without|isn't|wasn't|hasn't|haven't|doesn't|don't|didn't)\b|ಇಲ್ಲ|ಅಲ್ಲ|ಆಗಿಲ್ಲ|नहीं|नही|बिना|मत\s/iu;
  const negativeSource = negative.test(source);
  return [
    { name: 'transcript_requires_audio', passed: hasAudio || value.transcript === null },
    { name: 'audio_transcript_present', passed: !hasAudio || !!value.transcript },
    { name: 'nonempty_rewrite', passed: (!!source || hasPhoto) && !!value.post },
    { name: 'numbers_preserved', passed: numbers(source) === numbers(value.post) },
    { name: translated ? 'translation_requires_citizen_review' : 'original_detail_retained', passed: translated || !meaningful.length || retained.length / meaningful.length >= 0.35 },
    { name: 'no_added_outcome_or_accusation', passed: !addedClaims.length },
    { name: 'negative_intent_preserved', passed: !negativeSource || negative.test(value.post) },
  ];
}
