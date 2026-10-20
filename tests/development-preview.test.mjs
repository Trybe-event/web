import test from "node:test";
import assert from "node:assert/strict";

async function previewConfig(appUrl) {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  try {
    if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = appUrl;
    const moduleUrl = new URL("../next.config.ts", import.meta.url);
    moduleUrl.searchParams.set("test", crypto.randomUUID());
    return (await import(moduleUrl.href)).default;
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  }
}

test("development preview allows only its configured hostname, without wildcard tunnel trust", async () => {
  const config = await previewConfig(
    "https://testing-fixture.trycloudflare.com",
  );
  assert.deepEqual(config.allowedDevOrigins, [
    "localhost",
    "127.0.0.1",
    "testing-fixture.trycloudflare.com",
  ]);
  assert.ok(!config.allowedDevOrigins.includes("*.trycloudflare.com"));
  assert.ok(!config.allowedDevOrigins.includes("10.146.93.221"));
});

test("no preview configured retains localhost access without adding external hosts", async () => {
  const config = await previewConfig(undefined);
  assert.deepEqual(config.allowedDevOrigins, ["localhost", "127.0.0.1"]);
});

test("development origin entries contain hostnames, not schemes, ports or paths", async () => {
  const config = await previewConfig("https://preview.example.test:8443/");
  assert.equal(config.allowedDevOrigins.at(-1), "preview.example.test");
});
