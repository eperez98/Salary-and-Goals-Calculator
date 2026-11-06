/** snake_case row → camelCase object, converting 0/1 flags to booleans. */
const BOOL = new Set(['is_owner', 'active', 'archived', 'is_system', 'auto_post', 'closed', 'done']);
export function camel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = BOOL.has(k) ? v === 1 || v === true : v;
  }
  return out as T;
}
