import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resolved = {
  placeId?: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  source?: "findplace" | "textsearch" | "geocode";
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const address = searchParams.get("address") || "";
  const debug = searchParams.get("debug") === "1";
  return handler(name, address, debug);
}

export async function POST(req: Request) {
  try {
    const { name, address, debug } = await req.json();
    if (!name || !address) {
      return NextResponse.json({ error: "name and address required" }, { status: 400 });
    }
    return handler(String(name), String(address), !!debug);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
}

async function handler(name: string, address: string, debug = false) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  const query = `${name} ${address}`.trim();
  const common = { language: "ja", region: "jp" };

  // 1) Find Place From Text
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
    url.searchParams.set("input", query);
    url.searchParams.set("inputtype", "textquery");
    url.searchParams.set("fields", "place_id,name,geometry,formatted_address,business_status");
    url.searchParams.set("language", common.language);
    url.searchParams.set("region", common.region);
    url.searchParams.set("key", key);

    const r = await fetch(url.toString(), { cache: "no-store" });
    const t = await r.text();
    if (r.ok) {
      const j = JSON.parse(t);
      if (j.status === "OK" && Array.isArray(j.candidates) && j.candidates.length) {
        const c = j.candidates[0];
        const out: Resolved = {
          placeId: c.place_id,
          lat: c.geometry?.location?.lat,
          lng: c.geometry?.location?.lng,
          formattedAddress: c.formatted_address,
          source: "findplace",
        };
        return NextResponse.json(debug ? { ...out, raw: slice(t) } : out);
      }
    }
  } catch (e) {
    // 続行（フォールバック）
    console.warn("[resolve-place] findplace failed:", e);
  }

  // 2) Text Search
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("language", common.language);
    url.searchParams.set("region", common.region);
    url.searchParams.set("key", key);

    const r = await fetch(url.toString(), { cache: "no-store" });
    const t = await r.text();
    if (r.ok) {
      const j = JSON.parse(t);
      if (j.status === "OK" && Array.isArray(j.results) && j.results.length) {
        const c = j.results[0];
        const out: Resolved = {
          placeId: c.place_id,
          lat: c.geometry?.location?.lat,
          lng: c.geometry?.location?.lng,
          formattedAddress: c.formatted_address,
          source: "textsearch",
        };
        return NextResponse.json(debug ? { ...out, raw: slice(t) } : out);
      }
    }
  } catch (e) {
    console.warn("[resolve-place] textsearch failed:", e);
  }

  // 3) Geocoding（保険）
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("language", common.language);
    url.searchParams.set("region", common.region);
    url.searchParams.set("key", key);

    const r = await fetch(url.toString(), { cache: "no-store" });
    const t = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: "upstream http error", body: slice(t) }, { status: 502 });
    }
    const j = JSON.parse(t);
    if (j.status !== "OK" || !Array.isArray(j.results) || j.results.length === 0) {
      return NextResponse.json(
        { error: "not found", googleStatus: j.status, googleError: j.error_message, debug: debug ? j : undefined },
        { status: 404 }
      );
    }
    const g = j.results[0];
    const out: Resolved = {
      placeId: g.place_id,
      lat: g.geometry?.location?.lat,
      lng: g.geometry?.location?.lng,
      formattedAddress: g.formatted_address,
      source: "geocode",
    };
    return NextResponse.json(debug ? { ...out, raw: slice(t) } : out);
  } catch (e) {
    console.error("[resolve-place] geocode exception", e);
    return NextResponse.json({ error: "resolve failed" }, { status: 500 });
  }
}

function slice(s: string, n = 1200) {
  return s.length > n ? s.slice(0, n) + "...(truncated)" : s;
}
