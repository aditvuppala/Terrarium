/** Shared helpers for ingestion scripts (Node only, never imported by the app). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import type { z } from "zod";

export const ROOT = process.cwd();
export const DATA = path.join(ROOT, "data");
export const RAW = path.join(DATA, "raw");
export const PROCESSED = path.join(DATA, "processed");
export const CACHE = path.join(DATA, "cache");
export const GTFS_DIR = path.join(DATA, "gtfs");

/** Identifies us to free public APIs (Census, Nominatim, Overpass). No personal info. */
export const USER_AGENT = "Terrarium/0.1 (University of Michigan student hackathon project; local, low-volume use)";

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function readJsonValidated<T extends z.ZodType>(file: string, schema: T): z.infer<T> {
  const parsed = schema.safeParse(readJson(file));
  if (!parsed.success) {
    console.error(`✗ ${path.relative(ROOT, file)} failed validation:`);
    for (const issue of parsed.error.issues.slice(0, 10)) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }
  return parsed.data;
}

export function writeJson(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`  wrote ${path.relative(ROOT, file)}`);
}

export function readCache<T>(name: string, fallback: T): T {
  const file = path.join(CACHE, name);
  return existsSync(file) ? readJson<T>(file) : fallback;
}

export function writeCache(name: string, data: unknown): void {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path.join(CACHE, name), JSON.stringify(data, null, 2) + "\n");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

export const today = () => new Date().toISOString().slice(0, 10);

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
