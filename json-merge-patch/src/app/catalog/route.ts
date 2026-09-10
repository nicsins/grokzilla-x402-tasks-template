import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000";

export async function GET() {
  return NextResponse.json({
    name: "x402-json-merge-patch",
    version: "1.0.0",
    description: "Apply RFC 7396 JSON Merge Patch to a target document. Fully deterministic, pure, agent-native for config merging and state updates.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.008 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/patch",
        description: "Apply JSON Merge Patch (RFC 7396)",
        input: {
          target: "any (the document to patch)",
          patch: "object | null | value (the merge patch)",
        },
        output: { success: true, result: "merged document", meta: "object" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
