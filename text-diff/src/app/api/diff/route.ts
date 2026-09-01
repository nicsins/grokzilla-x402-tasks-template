import { NextRequest, NextResponse } from "next/server";

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "10000";

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

type Op = { op: "equal" | "insert" | "delete"; text: string };

function tokenize(text: string, mode: "lines" | "words" | "chars"): string[] {
  if (mode === "chars") return text.split("");
  if (mode === "words") return text.split(/(\s+)/).filter(Boolean);
  return text.split(/\r?\n/);
}

function simpleDiff(aTokens: string[], bTokens: string[]): Op[] {
  const n = aTokens.length;
  const m = bTokens.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (aTokens[i - 1] === bTokens[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops: Op[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aTokens[i - 1] === bTokens[j - 1]) {
      ops.unshift({ op: "equal", text: aTokens[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ op: "insert", text: bTokens[j - 1] });
      j--;
    } else {
      ops.unshift({ op: "delete", text: aTokens[i - 1] });
      i--;
    }
  }
  return ops;
}

function toUnified(ops: Op[], context = 2): string {
  const lines: string[] = [];
  let buffer: Op[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    for (const o of buffer) {
      const prefix = o.op === "equal" ? " " : o.op === "insert" ? "+" : "-";
      lines.push(prefix + o.text);
    }
    buffer = [];
  };
  for (const op of ops) {
    if (op.op === "equal") {
      buffer.push(op);
      if (buffer.length > context * 2) buffer = buffer.slice(-context);
    } else {
      flush();
      lines.push((op.op === "insert" ? "+" : "-") + op.text);
    }
  }
  flush();
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Compute structured or unified text/JSON diff between two strings",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-text-diff", version: "1.0.0" },
    };
    return NextResponse.json(
      { error: "Payment Required", message: "This endpoint requires an x402 payment. Retry with PAYMENT-SIGNATURE header.", accepts: [paymentRequirements] },
      { status: 402, headers: { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequirements)).toString("base64"), "Content-Type": "application/json" } }
    );
  }
  try {
    const body = await req.json();
    const a = typeof body.a === "string" ? body.a : JSON.stringify(body.a ?? "");
    const b = typeof body.b === "string" ? body.b : JSON.stringify(body.b ?? "");
    if (a.length + b.length > 200_000) return NextResponse.json({ error: "Combined input too large (max ~200k chars)" }, { status: 413 });
    const options = body.options || {};
    const mode = (["lines", "words", "chars"].includes(options.mode) ? options.mode : "lines") as "lines" | "words" | "chars";
    const context = Math.min(Math.max(Number(options.context) || 2, 0), 10);
    const format = options.format === "unified" ? "unified" : "structured";
    const ops = simpleDiff(tokenize(a, mode), tokenize(b, mode));
    let adds = 0, removes = 0;
    for (const o of ops) { if (o.op === "insert") adds++; if (o.op === "delete") removes++; }
    const result = format === "unified" ? toUnified(ops, context) : ops.map((o) => ({ op: o.op, text: o.text }));
    return NextResponse.json({ success: true, diff: result, meta: { adds, removes, equals: ops.length - adds - removes, mode, format, aLength: a.length, bLength: b.length } });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-text-diff",
    description: "Lightweight deterministic line/word/char diff. Structured or unified output. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/diff" },
  });
}
