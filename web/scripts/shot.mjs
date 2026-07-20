import { chromium } from "playwright";
import { mkdirSync } from "fs";

const base = "http://localhost:3000";
const out = "C:/Users/naga6/stockapp/trade-vision-app/web/shots";
mkdirSync(out, { recursive: true });
const errors = [];
const notFound = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CONSOLE: " + m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERR: " + e.message));
page.on("response", (r) => {
  if (r.status() === 404) notFound.push(r.url());
});

try {
  // 1) Technical chart
  await page.goto(`${base}/stock/RELIANCE/technical`, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/technical.png` });
  const chartInfo = await page.evaluate(() => {
    const c = document.querySelector(".tv-canvas");
    const wrap = document.querySelector(".tv-chart-wrap");
    const canvas = document.querySelector(".tv-canvas canvas");
    return {
      hasCanvas: !!canvas,
      canvasW: canvas?.width || 0,
      canvasH: canvas?.height || 0,
      wrapH: wrap ? wrap.getBoundingClientRect().height : 0,
    };
  });
  console.log("TECHNICAL chart info:", JSON.stringify(chartInfo));

  // 2) Analytics report
  await page.goto(`${base}/analytics`, { waitUntil: "networkidle" });
  const input = page.locator('input[placeholder^="Search stock"]');
  await input.click();
  await input.fill("RELIANCE");
  await input.press("Enter");
  await page.waitForTimeout(5000);
  const reportHtml = await page.evaluate(() => {
    const body = document.querySelector(".rr-body");
    const panel = [...document.querySelectorAll(".panel-title")].find((n) =>
      n.textContent.includes("Research Report"),
    );
    const note = document.querySelector(".empty-note");
    return {
      rrBodyFound: !!body,
      rrBodyText: body ? body.innerText.slice(0, 600) : null,
      reportPanelFound: !!panel,
      emptyNote: note ? note.innerText : null,
    };
  });
  console.log("ANALYTICS report:", JSON.stringify(reportHtml, null, 2));
  if (reportHtml.rrBodyFound) {
    await page.locator(".rr-body").first().screenshot({ path: `${out}/report.png` });
  } else {
    await page.screenshot({ path: `${out}/analytics.png` });
  }
} catch (e) {
  console.log("SCRIPT ERROR:", e.message);
} finally {
  console.log("=== 404s (" + notFound.length + ") ===");
  [...new Set(notFound)].slice(0, 15).forEach((u) => console.log(u));
  console.log("=== ERRORS (" + errors.length + ") ===");
  errors.slice(0, 15).forEach((e) => console.log(e));
  await browser.close();
}
