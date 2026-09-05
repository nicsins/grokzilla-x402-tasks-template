import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "x402-phone-normalizer",
    version: "1.0.0",
    description: "Normalize phone numbers to E.164 style with basic country detection. Pure JS, no external libs.",
    price: { amount: "7000", currency: "USDC", network: "base", display: "$0.007" },
    endpoints: [
      {
        method: "POST",
        path: "/api/normalize",
        input: { phone: "string", defaultCountry: "optional ISO alpha-2" },
        output: { success: true, e164: "string|null", national: "string", country: "string|null", valid: "boolean" }
      }
    ],
    tags: ["phone", "e164", "normalize", "agent-tool", "x402"],
    noHumanInLoop: true
  });
}
