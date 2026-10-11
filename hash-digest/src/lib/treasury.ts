/**
 * Treasury payTo + network, checked once at module load (fail closed).
 *
 * - payTo comes from TREASURY_ADDRESS (plain env). PAY_TO_ADDRESS is NOT read: it held the old,
 *   unrecoverable wallet on several projects.
 * - The address must be EIP-55 checksummed and must not be the retired wallet.
 * - Network is CAIP-2. Default Base mainnet (eip155:8453). Anything else needs X402_ALLOW_TESTNET=1.
 * Same rule as ai-micro-pay's startup check. A bad config throws, so the route returns 500
 * instead of advertising a wrong wallet.
 */

const RETIRED = new Set(["0xda1eab46918882f8656a41cf9fca80e2415369d1"]);
const DEFAULT_TREASURY = "0xc22f9CAEBAc37fE72D5142f35f21f6696Ea9Ef69";
const MAINNET = "eip155:8453";

// keccak-256 (Ethereum variant, 0x01 padding) on 32-bit lane halves. No BigInt, so it builds
// on ES2017 targets. Only used once at startup.
const RC_HI = [0x00000000, 0x00000000, 0x80000000, 0x80000000, 0x00000000, 0x00000000, 0x80000000, 0x80000000,
  0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x80000000, 0x80000000, 0x80000000,
  0x80000000, 0x80000000, 0x00000000, 0x80000000, 0x80000000, 0x80000000, 0x00000000, 0x80000000];
const RC_LO = [0x00000001, 0x00008082, 0x0000808a, 0x80008000, 0x0000808b, 0x80000001, 0x80008081, 0x00008009,
  0x0000008a, 0x00000088, 0x80008009, 0x8000000a, 0x8000808b, 0x0000008b, 0x00008089, 0x00008003,
  0x00008002, 0x00000080, 0x0000800a, 0x8000000a, 0x80008081, 0x00008080, 0x80000001, 0x80008008];
const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];

function rotl(hi: number, lo: number, n: number): [number, number] {
  if (n === 0) return [hi, lo];
  if (n >= 32) { const t = hi; hi = lo; lo = t; n -= 32; }
  if (n === 0) return [hi >>> 0, lo >>> 0];
  return [((hi << n) | (lo >>> (32 - n))) >>> 0, ((lo << n) | (hi >>> (32 - n))) >>> 0];
}

function keccakF(h: Uint32Array, l: Uint32Array) {
  const ch = new Uint32Array(5), cl = new Uint32Array(5), bh = new Uint32Array(25), bl = new Uint32Array(25);
  for (let r = 0; r < 24; r++) {
    for (let x = 0; x < 5; x++) {
      ch[x] = h[x] ^ h[x + 5] ^ h[x + 10] ^ h[x + 15] ^ h[x + 20];
      cl[x] = l[x] ^ l[x + 5] ^ l[x + 10] ^ l[x + 15] ^ l[x + 20];
    }
    for (let x = 0; x < 5; x++) {
      const [rh, rl] = rotl(ch[(x + 1) % 5], cl[(x + 1) % 5], 1);
      const dh = ch[(x + 4) % 5] ^ rh, dl = cl[(x + 4) % 5] ^ rl;
      for (let y = 0; y < 25; y += 5) { h[x + y] ^= dh; l[x + y] ^= dl; }
    }
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++) {
        const i = x + 5 * y, j = y + 5 * ((2 * x + 3 * y) % 5);
        const [rh, rl] = rotl(h[i], l[i], ROT[i]);
        bh[j] = rh; bl[j] = rl;
      }
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 25; y += 5) {
        h[x + y] = bh[x + y] ^ (~bh[((x + 1) % 5) + y] & bh[((x + 2) % 5) + y]);
        l[x + y] = bl[x + y] ^ (~bl[((x + 1) % 5) + y] & bl[((x + 2) % 5) + y]);
      }
    h[0] ^= RC_HI[r]; l[0] ^= RC_LO[r];
  }
}

export function keccak256Hex(input: string): string {
  const msg = Array.from(new TextEncoder().encode(input));
  const rate = 136;
  msg.push(0x01);
  while (msg.length % rate !== 0) msg.push(0);
  msg[msg.length - 1] |= 0x80;
  const h = new Uint32Array(25), l = new Uint32Array(25);
  for (let off = 0; off < msg.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) {
      const b = off + i * 8;
      l[i] ^= (msg[b] | (msg[b + 1] << 8) | (msg[b + 2] << 16) | (msg[b + 3] << 24)) >>> 0;
      h[i] ^= (msg[b + 4] | (msg[b + 5] << 8) | (msg[b + 6] << 16) | (msg[b + 7] << 24)) >>> 0;
    }
    keccakF(h, l);
  }
  let out = "";
  for (let i = 0; i < 4; i++)
    for (const w of [l[i], h[i]])
      for (let j = 0; j < 4; j++) out += ((w >>> (8 * j)) & 0xff).toString(16).padStart(2, "0");
  return out;
}

export function toChecksumAddress(addr: string): string {
  const lower = addr.toLowerCase().replace(/^0x/, "");
  const hash = keccak256Hex(lower);
  let out = "0x";
  for (let i = 0; i < 40; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

export function assertTreasury(raw: string | undefined): string {
  const addr = (raw || "").trim() || DEFAULT_TREASURY;
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr) || /^0x0{40}$/.test(addr)) throw new Error("TREASURY_ADDRESS must be a non-zero 20-byte EVM address");
  if (RETIRED.has(addr.toLowerCase())) throw new Error("TREASURY_ADDRESS is the retired wallet; refusing to start");
  if (toChecksumAddress(addr) !== addr) throw new Error("TREASURY_ADDRESS is not EIP-55 checksummed");
  return addr;
}

export function assertNetwork(raw: string | undefined): string {
  const n = (raw || "").trim();
  const net = !n || n === "base" ? MAINNET : n;
  if (net !== MAINNET && process.env.X402_ALLOW_TESTNET !== "1") throw new Error(`X402 network ${net} is not Base mainnet; set X402_ALLOW_TESTNET=1 to allow`);
  return net;
}

export const PAY_TO = assertTreasury(process.env.TREASURY_ADDRESS);
export const NETWORK = assertNetwork(process.env.NETWORK);
