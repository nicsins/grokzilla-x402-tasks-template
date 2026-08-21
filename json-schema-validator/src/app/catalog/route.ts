import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "json-schema-validator",
        name: "JSON Schema Validator",
        description: "Lightweight, deterministic JSON Schema validation (type, required, properties, enum, ranges). Ideal for agents enforcing input contracts before tool calls or storage.",
        path: "/api/validate",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "8000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
        inputSchema: {
          type: "object",
          required: ["data", "schema"],
          properties: {
            data: { description: "The value to validate" },
            schema: { type: "object", description: "JSON Schema subset" },
            options: {
              type: "object",
              properties: {
                coerce: { type: "boolean", default: false },
                removeAdditional: { type: "boolean", default: false },
              },
            },
          },
        },
      },
    ],
  });
}
