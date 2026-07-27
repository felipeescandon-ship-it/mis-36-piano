const textEncoder = new TextEncoder();

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

export async function sha256(value) {
  const data = typeof value === "string" ? value : stableStringify(value);
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(data));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function deterministicUuid(namespace, value) {
  const hex = await sha256(`${namespace}\u0000${value}`);
  const bytes = hex.slice(0, 32).match(/../g).map(part => Number.parseInt(part, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const normalized = bytes.map(byte => byte.toString(16).padStart(2, "0")).join("");
  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}
