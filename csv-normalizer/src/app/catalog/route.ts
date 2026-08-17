import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "csv-normalizer",
        name: "CSV / Delimited Text Normalizer",
        description: "Detect delimiter, fix headers, coerce types, output clean JSON or CSV. Ideal for agent data pipelines.",
        path: "/api/normalize",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "8000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
      },
    ],
  });
}
