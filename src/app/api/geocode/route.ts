// src/app/api/geocode/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";        // EdgeでなくNodeで実行
export const dynamic = "force-dynamic"; // つねに実行（キャッシュ無効）

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "missing GOOGLE_MAPS_API_KEY" }, { status: 500 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("language", "ja");
    url.searchParams.set("key", key);

    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }

    const j = await r.json();
    const first = j?.results?.[0];
    if (!first) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { lat, lng } = first.geometry?.location ?? {};
    const placeId = first.place_id as string | undefined;

    return NextResponse.json({ lat, lng, placeId });
  } catch {
    return NextResponse.json({ error: "geocode failed" }, { status: 500 });
  }
}
