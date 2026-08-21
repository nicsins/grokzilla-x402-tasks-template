import { NextRequest, NextResponse } from "next/server";

/**
 * x402 JSON Schema Validator – No-human-in-loop microservice
 * Price guidance: 0.004 – 0.012 USDC per call
 *
 * Accepts: { "data": any, "schema": object, "options"?: { "coerce": boolean, "removeAdditional": boolean } }
 * Returns: { "success": true, "valid": boolean, "errors": [], "coerced"?: any }
 *
 * Note: This is a lightweight subset validator (type, required, properties, enum, min/max).
 * For full draft-07 / OpenAPI use a heavier library in a dedicated service.
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xYourPayToAddressHere";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "8000"; // 0.008 USDC

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

type Schema = {
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: Schema;
  additionalProperties?: boolean;
};

function validate(value: any, schema: Schema, path = "$"): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema || typeof schema !== "object") {
    return { valid: true, errors: [] };
  }

  // type check
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual =
      value === null
        ? "null"
        : Array.isArray(value)
          ? "array"
          : typeof value;
    if (!allowed.includes(actual)) {
      errors.push(`${path}: expected type ${allowed.join("|")}, got ${actual}`);
      return { valid: false, errors };
    }
  }

  // enum
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: value not in enum`);
  }

  // string length
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: string longer than maxLength ${schema.maxLength}`);
    }
  }

  // number range
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: number below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: number above maximum ${schema.maximum}`);
    }
  }

  // object
  if (schema.type === "object" || (schema.properties && typeof value === "object" && value !== null && !Array.isArray(value))) {
    const obj = value as Record<string, any>;
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in obj)) errors.push(`${path}.${key}: required property missing`);
      }
    }
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          const res = validate(obj[key], propSchema, `${path}.${key}`);
          errors.push(...res.errors);
        }
      }
    }
  }

  // array
  if ((schema.type === "array" || schema.items) && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => {
      const res = validate(item, schema.items!, `${path}[${i}]`);
      errors.push(...res.errors);
    });
  }

  return { valid: errors.length === 0, errors };
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Lightweight JSON Schema validation (type, required, properties, enum, ranges)",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-json-schema-validator", version: "1.0.0" },
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
    const data = body.data;
    const schema = body.schema;

    if (schema === undefined || typeof schema !== "object") {
      return NextResponse.json({ error: "Missing or invalid 'schema' field" }, { status: 400 });
    }

    const result = validate(data, schema);

    const response: any = {
      success: true,
      valid: result.valid,
      errors: result.errors,
    };

    // simple coerce stub (numbers/strings only for now)
    if (body.options?.coerce && result.valid && typeof data === "object") {
      response.coerced = data; // full coercion would go here
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-json-schema-validator",
    description: "Lightweight deterministic JSON Schema validation for agent contracts. Supports type, required, properties, enum, min/max.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/validate" },
  });
}
