import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "slugify",
    version: "1.0.0",
    payTo: process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1",
    network: "eip155:8453",
    services: [
      {
        id: "slugify",
        method: "POST",
        path: "/api/slugify",
        price_usd: 0.002,
        description: "Unicode-normalized URL slug generator.",
      },
    ],
  });
}
