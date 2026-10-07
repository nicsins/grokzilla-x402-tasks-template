import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "5000";

export async function GET() {
  return NextResponse.json({
    name: "x402-email-canonicalizer",
    version: "1.0.0",
    description: "Email canonicalization & basic validation for agent identity resolution and deduplication.",
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
        path: "/api/canonicalize",
        description: "Actions: canonicalize (default) | validate | batch",
        body: {
          action: "canonicalize|validate|batch",
          email: "string",
          emails: "string[] (for batch, max 50)",
          options: { removePlusTag: true, removeDots: true, lowercase: true },
        },
      },
    ],
    free: {
      discovery: "/catalog",
      info: "GET /api/canonicalize",
    },
  });
}
