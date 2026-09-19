import { NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
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
