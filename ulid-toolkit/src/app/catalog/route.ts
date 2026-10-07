import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-ulid-toolkit",
    version: "1.0.0",
    description: "ULID generate / parse / validate / timestamp. Deterministic, sortable unique identifiers for agents.",
    pricing: {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      currency: "USDC",
      payTo: PAY_TO,
    },
    endpoints: [
      {
        method: "POST",
        path: "/api/ulid",
        description: "Actions: generate | parse | validate | timestamp",
        body: {
          action: "generate|parse|validate|timestamp",
          ulid: "string (for parse/validate/timestamp)",
          timestamp: "number (optional for generate)",
        },
      },
    ],
    free: {
      discovery: "/catalog",
      info: "GET /api/ulid",
    },
  });
}
