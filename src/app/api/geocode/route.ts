// /pages/api/geocode.ts (Next.js App Router なら route.ts)
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { address } = req.body as { address: string };
    if (!address) return res.status(400).json({ error: "address required" });

    // 例: Google Geocoding API
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("language", "ja"); // 原文に合わせると安定
    url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY!);

    const r = await fetch(url);
    const j = await r.json();
    const first = j.results?.[0];
    if (!first) return res.status(404).json({ error: "not found" });

    const { lat, lng } = first.geometry.location;
    const placeId = first.place_id;
    return res.status(200).json({ lat, lng, placeId });
  } catch  {
    return res.status(500).json({ error: "geocode failed" });
  }
}
