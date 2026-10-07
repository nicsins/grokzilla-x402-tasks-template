import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

export async function GET() {
  return NextResponse.json({
    name: "x402-json-canonicalizer",
    version: "1.0.0",
    description: "Deterministic JSON Canonicalization (JCS / RFC 8785 style). Stable key order, no whitespace, number normalization. Agent-native for signing and hashing.",
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
        path: "/api/canonicalize",
        description: "Canonicalize arbitrary JSON to a deterministic string",
        input: {
          data: "any JSON-serializable value (or send raw JSON body)",
        },
        output: { success: true, result: "string (canonical JSON)", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
