import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    services: [
      {
        id: "keyword-extractor",
        name: "Keyword Extractor",
        description: "Deterministic keyword and keyphrase extraction using frequency + simple TF scoring. Ideal for agents building indexes, selecting tools, or auto-tagging without heavy NLP models.",
        path: "/api/extract",
        method: "POST",
        price: {
          amount: process.env.MAX_AMOUNT_ATOMIC || "10000",
          currency: "USDC",
          network: process.env.NETWORK || "base",
        },
        inputSchema: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", description: "Text to extract keywords from" },
            options: {
              type: "object",
              properties: {
                topK: { type: "number", default: 15 },
                minLength: { type: "number", default: 3 },
                includePhrases: { type: "boolean", default: true },
                stopwords: { type: "string", enum: ["en", "none"], default: "en" },
              },
            },
          },
        },
      },
    ],
  });
}
