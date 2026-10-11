import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000";

export async function GET() {
  return NextResponse.json({
    name: "x402-text-diff",
    version: "1.0.0",
    description: "Lightweight deterministic text/JSON diff (lines, words, or chars). Structured ops or unified output.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.005 – 0.015 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/diff",
        description: "Compute diff",
        input: { a: "string", b: "string", options: { mode: "lines|words|chars", context: 2, format: "structured|unified" } },
        output: { success: true, diff: "ops[] or unified string", meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["diff", "text", "change-detection", "agent-utility", "deterministic"],
  });
}
