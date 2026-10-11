import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

export async function GET() {
  return NextResponse.json({
    name: "x402-phonetic-encoder",
    version: "1.0.0",
    description: "Soundex + lightweight Metaphone phonetic keys. Ideal for fuzzy name / entity matching across systems.",
    protocol: "x402",
    network: NETWORK,
    pricing: {
      amountAtomic: MAX_AMOUNT,
      currency: "USDC",
      guidance: "0.003 – 0.007 USDC per call",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/encode",
        description: "Encode one or more strings",
        input: { text: "string | string[]", options: { algorithms: ["soundex", "metaphone"] } },
        output: { success: true, results: [{ input: "", soundex: "", metaphone: "" }], meta: {} },
      },
    ],
    free: ["/catalog"],
    tags: ["phonetic", "soundex", "metaphone", "name-matching", "fuzzy", "agent-utility", "deterministic"],
  });
}
