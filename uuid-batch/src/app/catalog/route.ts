import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "uuid-batch",
    version: "1.0.0",
    payTo: process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69",
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
