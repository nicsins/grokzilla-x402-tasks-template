import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-uri-codec",
    version: "1.0.0",
    description: "Percent-encode / decode / normalize URI components with optional extra safe characters. UTF-8 correct.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.002 – 0.006 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/codec",
        description: "Encode, decode or normalize",
        input: { text: "string | string[]", action: "encode|decode|normalize", options: { safe: "" } },
        output: { success: true, results: [{ input: "", output: "" }], meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["uri", "url", "encode", "decode", "percent", "agent-utility", "deterministic"],
  });
}
