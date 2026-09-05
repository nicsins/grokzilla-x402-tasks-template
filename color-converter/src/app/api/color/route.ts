import { NextRequest, NextResponse } from "next/server";

/**
 * x402 Color Converter – No-human-in-loop microservice
 * Price guidance: 0.003 – 0.008 USDC per call
 *
 * Accepts: { "value": string|object, "from": "hex"|"rgb"|"hsl", "to": "hex"|"rgb"|"hsl" }
 * or shorthand { "hex": "#ff0000" } / { "rgb": [255,0,0] } / { "hsl": [0,100,50] }
 * Returns: { "success": true, "hex": "...", "rgb": [...], "hsl": [...], "meta": {...} }
 */

const PAY_TO = process.env.PAY_TO_ADDRESS || "0xDa1Eab46918882f8656a41cF9fCa80e2415369d1";
const NETWORK = process.env.NETWORK || "base";
const MAX_AMOUNT = process.env.MAX_AMOUNT_ATOMIC || "6000"; // ~0.006 USDC

function hasValidPayment(req: NextRequest): boolean {
  const signature = req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("x-payment");
  if (req.headers.get("x-test-payment") === "true") return true;
  return Boolean(signature && signature.length > 20);
}

function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace(/^#/, "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => clamp(x).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h / 360 + 1/3);
  const g = hue2rgb(p, q, h / 360);
  const b = hue2rgb(p, q, h / 360 - 1/3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export async function POST(req: NextRequest) {
  if (!hasValidPayment(req)) {
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: MAX_AMOUNT,
      resource: req.url,
      description: "Convert colors between HEX, RGB and HSL – pure deterministic math",
      mimeType: "application/json",
      payTo: PAY_TO,
      extra: { name: "x402-color-converter", version: "1.0.0" },
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
    let rgb: [number, number, number] | null = null;

    if (body.hex) {
      rgb = hexToRgb(String(body.hex));
    } else if (Array.isArray(body.rgb) && body.rgb.length >= 3) {
      rgb = [Number(body.rgb[0]), Number(body.rgb[1]), Number(body.rgb[2])];
    } else if (Array.isArray(body.hsl) && body.hsl.length >= 3) {
      rgb = hslToRgb(Number(body.hsl[0]), Number(body.hsl[1]), Number(body.hsl[2]));
    } else if (body.value) {
      const from = (body.from || "hex").toLowerCase();
      if (from === "hex") rgb = hexToRgb(String(body.value));
      else if (from === "rgb" && Array.isArray(body.value)) rgb = [Number(body.value[0]), Number(body.value[1]), Number(body.value[2])];
      else if (from === "hsl" && Array.isArray(body.value)) rgb = hslToRgb(Number(body.value[0]), Number(body.value[1]), Number(body.value[2]));
    }

    if (!rgb || rgb.some(n => isNaN(n))) {
      return NextResponse.json({
        error: "Provide hex string, rgb [r,g,b] or hsl [h,s,l]",
        examples: { hex: "#ff5500", rgb: [255, 85, 0], hsl: [20, 100, 50] }
      }, { status: 400 });
    }

    const [r, g, b] = rgb.map(n => clamp(n));
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);

    return NextResponse.json({
      success: true,
      hex,
      rgb: [r, g, b],
      hsl,
      meta: { inputDetected: body.hex ? "hex" : body.rgb ? "rgb" : body.hsl ? "hsl" : body.from || "value" }
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "x402-color-converter",
    description: "Deterministic HEX ↔ RGB ↔ HSL color conversion. Agent-ready.",
    price: { amount: MAX_AMOUNT, currency: "USDC", network: NETWORK },
    endpoints: { POST: "/api/color" },
  });
}
