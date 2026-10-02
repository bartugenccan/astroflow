/**
 * A log-safe one-liner for an error. Prisma messages echo query arguments
 * (device ids, user text) and upstream errors can carry whole response
 * bodies, so logs get the error's name and a short, scrubbed message only.
 */
export function safeError(err: unknown): string {
  if (!(err instanceof Error)) return 'UnknownError';
  const code = (err as { code?: unknown }).code;
  const name = typeof code === 'string' ? `${err.name}(${code})` : err.name;
  const first = err.message.split('\n').find((l) => l.trim()) ?? '';
  const scrubbed = first
    // uuids, emails and long digit runs are identifiers, not diagnostics
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>')
    .replace(/\d{6,}/g, '<n>')
    .slice(0, 200);
  return scrubbed ? `${name}: ${scrubbed}` : name;
}
