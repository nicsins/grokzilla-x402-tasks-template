import { NextResponse } from "next/server";

const PAY_TO = process.env.TREASURY_ADDRESS || process.env.PAY_TO_ADDRESS || "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000";

export async function GET() {
  return NextResponse.json({
    name: "x402-hmac-toolkit",
    version: "1.0.0",
    description: "HMAC-SHA256/SHA512 sign and verify. Deterministic message authentication for agents.",
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
        path: "/api/hmac",
        description: "Actions: sign (default) | verify",
        body: {
          action: "sign|verify",
          key: "string (secret)",
          message: "string",
          algorithm: "sha256|sha512|sha1|sha384 (default sha256)",
          encoding: "utf8|hex|base64 (input encoding for key/message)",
          outputEncoding: "hex|base64 (default hex)",
          signature: "string (required for verify)",
        },
      },
    ],
    free: {
      discovery: "/catalog",
      info: "GET /api/hmac",
    },
  });
}
