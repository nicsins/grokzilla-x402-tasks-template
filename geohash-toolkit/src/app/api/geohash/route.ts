import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Geohash Toolkit – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Actions:
 *   encode  { lat, lon, precision? } → { geohash }
 *   decode  { geohash } → { lat, lon, error, bbox }
 *   neighbors { geohash } → { n, ne, e, se, s, sw, w, nw }
 *   bbox    { geohash } → { minLat, minLon, maxLat, maxLon }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function encodeGeohash(lat: number, lon: number, precision = 9): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        idx = (idx << 1) + 1;
        lonMin = mid;
      } else {
        idx = idx << 1;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = (idx << 1) + 1;
        latMin = mid;
      } else {
        idx = idx << 1;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}

function decodeGeohash(geohash: string): { lat: number; lon: number; error: { lat: number; lon: number }; bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number } } {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (const c of geohash.toLowerCase()) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) throw new Error(`Invalid geohash character: ${c}`);
    for (let mask = 16; mask > 0; mask >>= 1) {
      if (evenBit) {
        const mid = (lonMin + lonMax) / 2;
        if (idx & mask) lonMin = mid;
        else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & mask) latMin = mid;
        else latMax = mid;
      }
      evenBit = !evenBit;
    }
  }

  const lat = (latMin + latMax) / 2;
  const lon = (lonMin + lonMax) / 2;
  return {
    lat,
    lon,
    error: { lat: (latMax - latMin) / 2, lon: (lonMax - lonMin) / 2 },
    bbox: { minLat: latMin, minLon: lonMin, maxLat: latMax, maxLon: lonMax },
  };
}

function neighbors(geohash: string): Record<string, string> {
  const { lat, lon, error } = decodeGeohash(geohash);
  const p = geohash.length;
  const dLat = error.lat * 2.1;
  const dLon = error.lon * 2.1;

  const dirs: Record<string, [number, number]> = {
    n:  [lat + dLat, lon],
    ne: [lat + dLat, lon + dLon],
    e:  [lat, lon + dLon],
    se: [lat - dLat, lon + dLon],
    s:  [lat - dLat, lon],
    sw: [lat - dLat, lon - dLon],
    w:  [lat, lon - dLon],
    nw: [lat + dLat, lon - dLon],
  };

  const result: Record<string, string> = {};
  for (const [k, [la, lo]] of Object.entries(dirs)) {
    const cla = Math.max(-90, Math.min(90, la));
    const clo = ((lo + 180) % 360 + 360) % 360 - 180;
    result[k] = encodeGeohash(cla, clo, p);
  }
  return result;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Geohash encode/decode/neighbors/bbox. Deterministic agent utility for spatial indexing.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-geohash-toolkit", version: "1.0.0" },
    };

    return NextResponse.json(
      {
        error: "Payment Required",
        message: "This endpoint requires an x402 payment. Retry with PAYMENT-SIGNATURE header.",
        accepts: [paymentRequirements],
      },
      {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequirements)).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const action = String(body.action || "").toLowerCase();

    if (action === "encode") {
      const lat = Number(body.lat);
      const lon = Number(body.lon);
      const precision = Math.min(12, Math.max(1, Number(body.precision) || 9));
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
      }
      const geohash = encodeGeohash(lat, lon, precision);
      return NextResponse.json({ success: true, action: "encode", geohash, precision, lat, lon });
    }

    if (action === "decode") {
      const gh = String(body.geohash || "").toLowerCase().trim();
      if (!gh || gh.length > 12) return NextResponse.json({ error: "Invalid geohash" }, { status: 400 });
      const decoded = decodeGeohash(gh);
      return NextResponse.json({ success: true, action: "decode", geohash: gh, ...decoded });
    }

    if (action === "neighbors") {
      const gh = String(body.geohash || "").toLowerCase().trim();
      if (!gh || gh.length > 12) return NextResponse.json({ error: "Invalid geohash" }, { status: 400 });
      const n = neighbors(gh);
      return NextResponse.json({ success: true, action: "neighbors", geohash: gh, neighbors: n });
    }

    if (action === "bbox") {
      const gh = String(body.geohash || "").toLowerCase().trim();
      if (!gh || gh.length > 12) return NextResponse.json({ error: "Invalid geohash" }, { status: 400 });
      const { bbox } = decodeGeohash(gh);
      return NextResponse.json({ success: true, action: "bbox", geohash: gh, bbox });
    }

    return NextResponse.json({ error: "Unknown action. Use encode|decode|neighbors|bbox" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-geohash-toolkit",
    description: "Deterministic geohash encode / decode / neighbors / bbox. Agent-ready spatial utility.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/geohash" },
  });
}
