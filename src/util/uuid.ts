/** UUID v4. Uses crypto.randomUUID (available in modern browsers and Node 19+). */
export function uuid(): string {
  return crypto.randomUUID();
}
