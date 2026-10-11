import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
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
