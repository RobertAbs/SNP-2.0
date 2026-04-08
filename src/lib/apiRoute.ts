import { NextResponse } from "next/server";
import { fetchSheetCsv, type SheetSlug } from "./sheets";

interface CacheEntry<T> { data: T; ts: number; }

const CACHE_MS = 30_000;

/**
 * Фабрика API route для конкретного листа.
 * Каждый вызов makeApiRoute() создаёт собственный кэш.
 */
export function makeApiRoute<T>(slug: SheetSlug, parser: (csv: string) => T) {
  let cache: CacheEntry<T> | null = null;

  return async function GET(req: Request) {
    const force = new URL(req.url).searchParams.get("force") === "true";

    if (!force && cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json({ data: cache.data, cached: true, ts: cache.ts });
    }

    try {
      const csv = await fetchSheetCsv(slug);
      const data = parser(csv);
      cache = { data, ts: Date.now() };

      const response = NextResponse.json({ data, cached: false, ts: cache.ts });
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return response;
    } catch (err) {
      if (cache) {
        return NextResponse.json({ data: cache.data, cached: true, ts: cache.ts, error: String(err) });
      }
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  };
}
