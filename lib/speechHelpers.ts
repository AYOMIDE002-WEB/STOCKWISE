// Helpers for speaking replies aloud.

export type LangCode = "en" | "yo" | "ha" | "ig";

// Rough guess of which Nigerian language a reply is written in.
export function guessLang(text: string): LangCode {
  const t = text.toLowerCase();
  const count = (re: RegExp) => (t.match(re) || []).length;
  const yo = count(/[\u1eb9\u1ecd\u1e63]/g) * 2 + count(/\b(mo|ti|ni|ko|se|re|jo|wa|ni|daa|kaabo|jowo|iresi|ewa|epo|idaji|agbon|nkan|miiran|ṣé|nǹkan|rẹ|jẹ|wọ́n)\b/g);
  const ha = count(/[\u0199\u0257\u0253]/g) * 2 + count(/\b(shinkafa|sukari|nawa|gode|don|allah|ina|kuma|wannan|zan|ruwa|gishiri|madara|wake)\b/g);
  const ig = count(/[\u1ecb\u1ee5]/g) * 2 + count(/\b(biko|dalu|ndewo|osikapa|agwa|mmanu|nnu|mmiri|achoro|nke|gi|ego|ole)\b/g);
  const best = Math.max(yo, ha, ig);
  if (best < 2) return "en";
  if (best === yo) return "yo";
  if (best === ha) return "ha";
  return "ig";
}

// Make written text easier for a voice to read.
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\u20a6\s?([\d,]+(?:\.\d+)?)/g, (_m, n: string) => `${n.replace(/,/g, "")} naira`)
    .replace(/\u00d7/g, " times ")
    .replace(/\s+/g, " ")
    .trim();
}
