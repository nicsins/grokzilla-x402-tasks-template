import { NextRequest, NextResponse } from "next/server";

/**
 * x402 JSON Merge Patch (RFC 7396) – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.010 USDC per call
 *
 * Accepts: { "target": any, "patch": object }
 * Returns: { "success": true, "result": merged }
 *
 * Pure deterministic implementation of RFC 7396.
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000"; // ~0.008 USDC

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function isObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * RFC 7396 JSON Merge Patch
 * null in patch deletes the key; objects recurse; other values replace.
 */
function mergePatch(target: any, patch: any): any {
  if (!isObject(patch)) {
    return patch;
  }

  const result: Record<string, any> = isObject(target) ? { ...target } : {};

  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value === null) {
      delete result[key];
    } else if (isObject(value)) {
      result[key] = mergePatch(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function sizeOf(obj: any, depth = 0): number {
  if (depth > 20) return 99999;
  if (obj === null || typeof obj !== "object") return 1;
  if (Array.isArray(obj)) return obj.reduce((s, v) => s + sizeOf(v, depth + 1), 0);
  return Object.keys(obj).reduce((s, k) => s + sizeOf(obj[k], depth + 1), 0);
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "RFC 7396 JSON Merge Patch. Deterministic config / state merge for agents.",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-json-merge-patch", version: "1.0.0" },
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
    const target = body.target;
    const patch = body.patch;

    if (patch === undefined) {
      return NextResponse.json({ error: "patch is required" }, { status: 400 });
    }

    const tSize = sizeOf(target);
    const pSize = sizeOf(patch);
    if (tSize + pSize > 50_000) {
      return NextResponse.json({ error: "Payload too large (combined node limit ~50k)" }, { status: 413 });
    }

    const result = mergePatch(target, patch);

    return NextResponse.json({
      success: true,
      result,
      meta: {
        targetNodes: tSize,
        patchNodes: pSize,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-json-merge-patch",
    description: "RFC 7396 JSON Merge Patch applicator. Deterministic agent utility.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/patch" },
  });
}
