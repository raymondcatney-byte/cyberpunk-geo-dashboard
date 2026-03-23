// Shared formatting contract for AI outputs.
// We keep this separate so every tab can enforce the same response style.

export const ESSAY_STYLE_SUFFIX = `FORMAT RULES (must follow):
- Write 6-10 paragraphs.
- No numbered outlines. No I./II./III. headings. No rigid templates.
- Minimal bullets; if you must use bullets, use at most 3 total.
- Paragraph 1 must state a clear thesis.
- Weave "what matters", "why now", and "next moves" into the prose.
- If the user requests JSON, return valid JSON only. Make string fields (e.g., summary) paragraph-style (2-3 short paragraphs) and avoid bullets inside strings.`;

export function composeSystemPrompt(basePrompt: string): string {
  const p = (basePrompt || '').trim();
  if (!p) return ESSAY_STYLE_SUFFIX;
  return `${p}\n\n${ESSAY_STYLE_SUFFIX}`;
}
