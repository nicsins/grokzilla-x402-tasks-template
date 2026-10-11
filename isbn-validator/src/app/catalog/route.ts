import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-isbn-validator",
    version: "1.0.0",
    description: "Validate ISBN-10/13, convert between formats, compute check digits. Fully deterministic, agent-native catalog primitive.",
    price: {
      amount: MAX_AMOUNT,
      currency: "USDC",
      network: NETWORK,
      human: "~0.006 USDC",
    },
    payTo: PAY_TO,
    endpoints: [
      {
        method: "POST",
        path: "/api/validate",
        description: "ISBN validate | convert | checkdigit",
        input: {
          isbn: "string (required for validate/convert)",
          action: "validate | convert | checkdigit (default validate)",
        },
        output: { success: true, valid: "boolean", type: "ISBN-10|ISBN-13", converted: "string|null" },
      },
    ],
    freeDiscovery: true,
    noHumanInLoop: true,
  });
}
