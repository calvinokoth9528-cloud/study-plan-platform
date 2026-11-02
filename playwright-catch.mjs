import { execSync } from "node:child_process";

const PLATFORM = process.platform;
const PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? `${process.env.HOME}/.cache/ms-playwright`;

// Install chromium into the playwright browsers cache if missing.
const binDir = `${PLAYWRIGHT_BROWSERS_PATH}/chromium-*`;
let chromiumBin = "";
try {
  const { execSync: es } = execSync;
  const out = execSync(`find ${PLAYWRIGHT_BROWSERS_PATH} -name "chromium" -type f 2>/dev/null`, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }).trim();
  if (out) chromiumBin = out.split("\n")[0];
} catch {}

if (!chromiumBin || !require("fs").existsSync(chromiumBin)) {
  console.log("chromium not found in", PLAYWRIGHT_BROWSERS_PATH, "— attempting install via npx (this may need sudo)");
  try {
    require("child_process").execSync("npx playwright install chromium", { stdio: "inherit", timeout: 300_000 });
  } catch (e) {
    console.error("chromium install failed:", e.message);
    process.exit(1);
  }
}

// Run the playwright tests.
const { execSync: run } = require("child_process");
try {
  run("npx playwright test --reporter=line", { stdio: "inherit", timeout: 120_000 });
} catch (e) {
  // playwright exit codes: 0 success, 1 test failures, 2 config error, etc.
  const code = e.status ?? e.code;
  if (code === 2) process.exit(2);
  process.exit(code ?? 1);
}
