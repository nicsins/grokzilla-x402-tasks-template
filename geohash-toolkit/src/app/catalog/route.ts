import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-geohash-toolkit",
    version: "1.0.0",
    description: "Encode/decode geohash, compute neighbors and bounding boxes. Fully deterministic, zero variance, agent-native spatial primitive.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.006 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/geohash",
        description: "Geohash encode | decode | neighbors | bbox",
        input: {
          action: "encode | decode | neighbors | bbox (required)",
          lat: "number (encode)",
          lon: "number (encode)",
          precision: "1-12 (encode, default 9)",
          geohash: "string (decode/neighbors/bbox)",
        },
        output: { success: true, /* action-specific fields */ },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
