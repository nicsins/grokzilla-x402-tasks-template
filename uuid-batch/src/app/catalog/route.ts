import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "uuid-batch",
    version: "1.0.0",
    payTo: process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1",
    network: "eip155:8453",
    services: [
      {
        id: "uuid-batch",
        method: "POST",
        path: "/api/uuid",
        price_usd: 0.002,
        description: "Mint or validate UUID v4 identifiers in batch.",
      },
    ],
  });
}
