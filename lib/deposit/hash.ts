/** Lowercase hex SHA-256 of the bytes, or null when Web Crypto isn't available (e.g. non-HTTPS). */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
    const digest = await subtle.digest("SHA-256", buf as Uint8Array<ArrayBuffer>);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export function shortHash(h: string | null): string {
  return h ? `${h.slice(0, 8)}…${h.slice(-6)}` : "unavailable";
}
