import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Unit Converter – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.009 USDC per call
 *
 * Accepts: { "value": number, "from": string, "to": string, "category"?: "length"|"mass"|"temperature"|"volume"|"speed" }
 * Returns: { "success": true, "result": number, "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "7000"; // ~0.007 USDC

function hasValidPayment(req: NextRequest): boolean {
  // STUB: replace with real x402 / facilitator verification in production
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

// Base factors relative to SI (or Celsius for temp)
const LENGTH: Record<string, number> = {
  m: 1, meter: 1, meters: 1,
  km: 1000, kilometer: 1000, kilometers: 1000,
  cm: 0.01, centimeter: 0.01, centimeters: 0.01,
  mm: 0.001, millimeter: 0.001, millimeters: 0.001,
  mi: 1609.344, mile: 1609.344, miles: 1609.344,
  yd: 0.9144, yard: 0.9144, yards: 0.9144,
  ft: 0.3048, foot: 0.3048, feet: 0.3048,
  in: 0.0254, inch: 0.0254, inches: 0.0254,
  nmi: 1852, "nautical-mile": 1852
};

const MASS: Record<string, number> = {
  kg: 1, kilogram: 1, kilograms: 1,
  g: 0.001, gram: 0.001, grams: 0.001,
  mg: 0.000001, milligram: 0.000001,
  lb: 0.45359237, pound: 0.45359237, pounds: 0.45359237,
  oz: 0.028349523125, ounce: 0.028349523125, ounces: 0.028349523125,
  t: 1000, tonne: 1000, ton: 907.18474, "us-ton": 907.18474
};

const VOLUME: Record<string, number> = {
  l: 1, liter: 1, litre: 1, liters: 1,
  ml: 0.001, milliliter: 0.001,
  gal: 3.785411784, gallon: 3.785411784, gallons: 3.785411784,
  qt: 0.946352946, quart: 0.946352946,
  pt: 0.473176473, pint: 0.473176473,
  cup: 0.2365882365,
  floz: 0.0295735295625, "fl-oz": 0.0295735295625,
  m3: 1000, "cubic-meter": 1000
};

const SPEED: Record<string, number> = {
  "m/s": 1, mps: 1,
  "km/h": 1 / 3.6, kph: 1 / 3.6,
  mph: 0.44704,
  knot: 0.514444, kn: 0.514444,
  fps: 0.3048
};

function convertTemperature(value: number, from: string, to: string): number | null {
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  let celsius: number;
  if (f === "c" || f === "celsius") celsius = value;
  else if (f === "f" || f === "fahrenheit") celsius = (value - 32) * 5 / 9;
  else if (f === "k" || f === "kelvin") celsius = value - 273.15;
  else return null;

  if (t === "c" || t === "celsius") return celsius;
  if (t === "f" || t === "fahrenheit") return celsius * 9 / 5 + 32;
  if (t === "k" || t === "kelvin") return celsius + 273.15;
  return null;
}

function convert(value: number, from: string, to: string, category?: string): number | null {
  const f = from.toLowerCase().trim();
  const t = to.toLowerCase().trim();
  if (f === t) return value;

  // Temperature special case
  if (["c", "celsius", "f", "fahrenheit", "k", "kelvin"].includes(f) ||
      ["c", "celsius", "f", "fahrenheit", "k", "kelvin"].includes(t) ||
      category === "temperature") {
    return convertTemperature(value, f, t);
  }

  const tables = [LENGTH, MASS, VOLUME, SPEED];
  for (const table of tables) {
    if (table[f] !== undefined && table[t] !== undefined) {
      const base = value * table[f];
      return base / table[t];
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Convert units across length, mass, temperature, volume, speed – deterministic pure math",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-unit-converter", version: "1.0.0" },
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
    const value = Number(body.value);
    const from = String(body.from || "").trim();
    const to = String(body.to || "").trim();
    const category = body.category ? String(body.category).toLowerCase() : undefined;

    if (isNaN(value) || !from || !to) {
      return NextResponse.json({ error: "Required: numeric 'value', string 'from', string 'to'" }, { status: 400 });
    }

    const result = convert(value, from, to, category);
    if (result === null) {
      return NextResponse.json({
        error: "Unsupported unit pair or category",
        supported: {
          length: Object.keys(LENGTH).slice(0, 12),
          mass: Object.keys(MASS).slice(0, 8),
          temperature: ["c", "f", "k"],
          volume: Object.keys(VOLUME).slice(0, 8),
          speed: Object.keys(SPEED)
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result: Number(result.toPrecision(12)),
      meta: { value, from, to, category: category || "auto" }
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-unit-converter",
    description: "Deterministic unit conversion (length, mass, temperature, volume, speed). Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/convert" },
  });
}
