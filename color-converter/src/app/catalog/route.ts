import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "x402-color-converter",
    version: "1.0.0",
    description: "Convert colors between HEX, RGB and HSL. Pure deterministic math, no external APIs.",
    price: { amount: "6000", currency: "USDC", network: "base", display: "$0.006" },
    endpoints: [
      {
        method: "POST",
        path: "/api/color",
        input: { hex: "string?", rgb: "[r,g,b]?", hsl: "[h,s,l]?" },
        output: { success: true, hex: "string", rgb: "[r,g,b]", hsl: "[h,s,l]" }
      }
    ],
    tags: ["color", "hex", "rgb", "hsl", "agent-tool", "x402"],
    noHumanInLoop: true
  });
}
