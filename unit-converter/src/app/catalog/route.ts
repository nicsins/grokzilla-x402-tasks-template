import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "x402-unit-converter",
    version: "1.0.0",
    description: "Convert units across length, mass, temperature, volume and speed. Pure deterministic math, no external APIs.",
    price: { amount: "7000", currency: "USDC", network: "base", display: "$0.007" },
    endpoints: [
      {
        method: "POST",
        path: "/api/convert",
        input: { value: "number", from: "string", to: "string", category: "optional string" },
        output: { success: true, result: "number", meta: "object" }
      }
    ],
    tags: ["units", "conversion", "math", "agent-tool", "x402"],
    noHumanInLoop: true
  });
}
