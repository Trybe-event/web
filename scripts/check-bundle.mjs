// Fails the build if server-only secret names or secret-looking values reach the
// browser bundle (MVP M1 audit: "server secrets absent from browser bundles").
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = ".next/static";
if (!existsSync(dir)) {
  console.error("Run `npm run build` first.");
  process.exit(1);
}
// Secret names are flagged unless they appear as a process.env lookup: libraries such as
// Clerk read env.CLERK_SECRET_KEY, which is always undefined in the browser.
const forbidden = [
  /(?<!env\.)CLERK_SECRET_KEY/,
  /(?<!env\.)PROXY_SHARED_SECRET/,
  /(?<!env\.)API_INTERNAL_URL/,
  /(?<!env\.)DATABASE_URL/,
  /(?<!env\.)STORAGE_SECRET/,
  /\bsk_(live|test)_[A-Za-z0-9]{10,}/,
  /whsec_[A-Za-z0-9+/=]{10,}/,
  /postgres(ql)?:\/\/[^\s"']+@/,
];
const values = [
  process.env.CLERK_SECRET_KEY,
  process.env.PROXY_SHARED_SECRET,
].filter((v) => v && v.length >= 8);

const hits = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json|map)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      for (const re of forbidden)
        if (re.test(text)) hits.push(`${p}: matches ${re}`);
      for (const v of values)
        if (text.includes(v))
          hits.push(`${p}: contains a configured secret value`);
    }
  }
};
walk(dir);
if (hits.length) {
  console.error("Secrets found in the browser bundle:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("Browser bundle clean: no server secrets found.");
