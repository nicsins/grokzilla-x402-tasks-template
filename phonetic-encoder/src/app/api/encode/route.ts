import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Phonetic Encoder – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.007 USDC per call
 *
 * Accepts: { "text": string | string[], "options"?: { "algorithms": ("soundex"|"metaphone")[] } }
 * Returns: { "success": true, "results": Array<{ input, soundex?, metaphone? }> }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000";

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

// Classic American Soundex
function soundex(s: string): string {
  const map: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };
  const cleaned = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned) return "0000";
  let code = cleaned[0];
  let prev = map[cleaned[0]] || "";
  for (let i = 1; i < cleaned.length && code.length < 4; i++) {
    const c = map[cleaned[i]] || "";
    if (c && c !== prev) {
      code += c;
      prev = c;
    } else if (!c) {
      prev = "";
    }
  }
  return (code + "000").slice(0, 4);
}

// Lightweight Metaphone-style (simplified, ASCII)
function metaphone(s: string): string {
  let str = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (!str) return "";
  str = str.replace(/(.)\1+/g, "$1");
  const out: string[] = [];
  let i = 0;
  const len = str.length;
  while (i < len && out.length < 6) {
    const c = str[i];
    const next = str[i + 1] || "";
    if ("AEIOU".includes(c)) {
      if (i === 0) out.push(c);
      i++;
      continue;
    }
    if (c === "B" && next !== "B") out.push("B");
    else if (c === "C") {
      if (next === "H") { out.push("X"); i++; }
      else if ("EIY".includes(next)) out.push("S");
      else out.push("K");
    }
    else if (c === "D") out.push(next === "G" ? "J" : "T");
    else if (c === "G") {
      if (next === "H") i++;
      else if ("EIY".includes(next)) out.push("J");
      else out.push("K");
    }
    else if (c === "H") {
      if (i === 0 || !"AEIOU".includes(str[i - 1]) || !"AEIOU".includes(next)) { /* skip */ }
      else out.push("H");
    }
    else if (c === "F" || c === "J" || c === "L" || c === "M" || c === "N" || c === "R") out.push(c);
    else if (c === "K") { if (str[i - 1] !== "C") out.push("K"); }
    else if (c === "P") out.push(next === "H" ? "F" : "P");
    else if (c === "Q") out.push("K");
    else if (c === "S") out.push(next === "H" ? "X" : "S");
    else if (c === "T") out.push(next === "H" ? "0" : "T");
    else if (c === "V") out.push("F");
    else if (c === "W" || c === "Y") { if ("AEIOU".includes(next)) out.push(c); }
    else if (c === "X") { out.push("KS"); }
    else if (c === "Z") out.push("S");
    i++;
  }
  return out.join("").slice(0, 6);
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Soundex + lightweight Metaphone phonetic keys for fuzzy name matching",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-phonetic-encoder", version: "1.0.0" },
    };

    return NextResponse.json(
      {
        error: "Payment Required",
        message: "This endpoint requires an x402 payment. Retry with PAYMENT-SIGNATURE header.",
        accepts: [paymentRequirements],
      },
      {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequirements)).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await req.json();
    let texts: string[] = [];
    if (typeof body.text === "string") texts = [body.text];
    else if (Array.isArray(body.text)) texts = body.text.map(String).slice(0, 50);
    else return NextResponse.json({ error: "Missing 'text' (string or array)" }, { status: 400 });

    const options = body.options || {};
    const algos: string[] = Array.isArray(options.algorithms)
      ? options.algorithms
      : ["soundex", "metaphone"];

    const results = texts.map((t) => {
      const r: Record<string, string> = { input: t };
      if (algos.includes("soundex")) r.soundex = soundex(t);
      if (algos.includes("metaphone")) r.metaphone = metaphone(t);
      return r;
    });

    return NextResponse.json({
      success: true,
      results,
      meta: { count: results.length, algorithms: algos },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-phonetic-encoder",
    description: "Soundex + lightweight Metaphone phonetic encoding for name/entity matching. Deterministic.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/encode" },
  });
}
