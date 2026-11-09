/** Appends the expected-shape hint so the model answers with bare JSON. */
export function withSchemaHint(user: string, schemaHint?: string): string {
  return schemaHint ? `${user}\n\nReturn ONLY valid JSON matching: ${schemaHint}` : user;
}

/** Tolerant JSON extraction — strips code fences and slices to the outer braces. */
export function parseModelJson<T>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return JSON.parse(s) as T;
}
