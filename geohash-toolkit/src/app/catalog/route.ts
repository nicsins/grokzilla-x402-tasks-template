import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

export async function GET() {
  return NextResponse.json({
    name: "x402-geohash-toolkit",
    version: "1.0.0",
    description: "Encode latitude/longitude to geohash, decode to bounding box + center, compute 8-neighbors. Fully deterministic pure JS, agent-native spatial indexing primitive.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.007 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/geohash",
        description: "encode | decode | neighbors",
        input: {
          action: "encode | decode | neighbors (required)",
          lat: "number -90..90 (encode)",
          lon: "number -180..180 (encode)",
          precision: "1-12 (default 9, encode)",
          hash: "string (decode / neighbors)",
        },
        output: { success: true /* action-specific fields */ },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
