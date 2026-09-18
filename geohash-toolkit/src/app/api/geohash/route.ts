import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Geohash Toolkit – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.009 USDC per call
 *
 * Actions:
 *   encode    { lat, lon, precision? } → { hash, precision }
 *   decode    { hash } → { lat, lon, latMin, latMax, lonMin, lonMax }
 *   neighbors { hash } → { n, ne, e, se, s, sw, w, nw }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000"; // ~0.007 USDC

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
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx = idx * 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
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

function decodeGeohash(hash: string) {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (const c of hash.toLowerCase()) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) throw new Error(`Invalid geohash character: ${c}`);
    for (let mask = 16; mask >= 1; mask >>= 1) {
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
  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
    latMin,
    latMax,
    lonMin,
    lonMax,
  };
}

function neighbors(hash: string) {
  // Approximate neighbor calculation via encode of nearby centers
  const { lat, lon, latMin, latMax, lonMin, lonMax } = decodeGeohash(hash);
  const dLat = (latMax - latMin);
  const dLon = (lonMax - lonMin);
  const precision = hash.length;

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
    // clamp
    const cla = Math.max(-90, Math.min(90, la));
    let clo = lo;
    if (clo > 180) clo -= 360;
    if (clo < -180) clo += 360;
    result[k] = encodeGeohash(cla, clo, precision);
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
      description: "Geohash encode / decode / neighbors. Deterministic spatial indexing for agents.",
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
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return NextResponse.json({ error: "Valid lat (-90..90) and lon (-180..180) required" }, { status: 400 });
      }
      const precision = Math.max(1, Math.min(12, Number(body.precision) || 9));
      const hash = encodeGeohash(lat, lon, precision);
      return NextResponse.json({ success: true, action: "encode", hash, precision, lat, lon });
    }

    if (action === "decode") {
      const hash = String(body.hash || "").trim().toLowerCase();
      if (!hash || !/^[0-9bcdefghjkmnpqrstuvwxyz]+$/.test(hash)) {
        return NextResponse.json({ error: "Valid geohash string required" }, { status: 400 });
      }
      const decoded = decodeGeohash(hash);
      return NextResponse.json({ success: true, action: "decode", hash, ...decoded });
    }

    if (action === "neighbors") {
      const hash = String(body.hash || "").trim().toLowerCase();
      if (!hash || !/^[0-9bcdefghjkmnpqrstuvwxyz]+$/.test(hash)) {
        return NextResponse.json({ error: "Valid geohash string required" }, { status: 400 });
      }
      const n = neighbors(hash);
      return NextResponse.json({ success: true, action: "neighbors", hash, neighbors: n });
    }

    return NextResponse.json({ error: "Unknown action. Use encode|decode|neighbors" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-geohash-toolkit",
    description: "Deterministic geohash encode/decode/neighbors. Agent-ready spatial indexing.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/geohash" },
  });
}
