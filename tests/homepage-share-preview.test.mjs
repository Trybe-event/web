import test from "node:test";
import assert from "node:assert/strict";

const base = process.env.TRYBE_TEST_WEB_URL ?? "http://127.0.0.1:3000";

test("homepage exposes an absolute social-preview image in crawler HTML and serves a public PNG", async () => {
  for (const userAgent of ["WhatsApp/2.24.1", "facebookexternalhit/1.1"]) {
    const response = await fetch(base, {
      headers: { "user-agent": userAgent },
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200);
    const head = (await response.text()).split("</head>")[0];
    const imageTag = head.match(/<meta property="og:image" content="([^"]+)"/);
    assert.ok(imageTag, `${userAgent} sees the image in the head`);
    const imageUrl = new URL(imageTag[1]);
    assert.ok(["http:", "https:"].includes(imageUrl.protocol));
    assert.equal(imageUrl.pathname, "/images/trybe-share-v1.png");
    assert.match(head, /name="twitter:card" content="summary_large_image"/);
    assert.match(head, /property="og:image:width" content="1200"/);
    assert.match(head, /property="og:image:height" content="630"/);
    const image = await fetch(new URL(imageUrl.pathname, base), {
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type"), /image\/png/);
    const bytes = Buffer.from(await image.arrayBuffer());
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
    assert.ok(
      bytes.length < 300_000,
      "default brand preview stays lightweight",
    );
  }
});
