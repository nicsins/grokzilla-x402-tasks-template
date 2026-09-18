export const metadata = { title: "x402 Hash Generator" };

export default function Page() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 720, padding: "2rem" }}>
      <h1>x402 Hash Generator</h1>
      <p>
        Deterministic cryptographic hashes for text and JSON. Use it for content
        addressing, integrity checks, cache keys, and idempotency keys.
      </p>
      <h2>Discover</h2>
      <ul>
        <li><code>GET /catalog</code> — machine-readable service catalog</li>
        <li><code>GET /api/hash</code> — endpoint details and price</li>
      </ul>
      <h2>Paid endpoint</h2>
      <p><code>POST /api/hash</code> — requires x402 payment (USDC on Base).</p>
      <pre>{`{
  "text": "text or JSON object",
  "algorithm": "sha256"
}`}</pre>
      <p>
        Supported algorithms are <code>sha256</code>, <code>sha1</code>, <code>md5</code>,
        and <code>sha512</code>. Send the request, handle the <code>402</code> response,
        then retry with a <code>PAYMENT-SIGNATURE</code> header. The response contains the
        hex hash and metadata describing the algorithm and input length.
      </p>
    </main>
  );
}
