import { chromium } from 'playwright';
const base = 'http://localhost:3002';
const browser = await chromium.launch();
const page = await browser.newPage();
const results = {};
async function visit(path, sel) {
  const r = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 }).catch(e=>({err:e.message}));
  let text = '';
  try { await page.waitForSelector(sel, { timeout: 15000 }); text = (await page.locator(sel).first().innerText()).slice(0,200); } catch(e){ text='<sel not found: '+sel+'>'; }
  const shot = '/tmp/shot_'+path.replace(/[\/\?=]/g,'_')+'.png';
  await page.screenshot({ path: shot, fullPage:false });
  results[path] = { status: r?.status?.() ?? 'err', sample: text, shot };
}
await visit('/', 'body');
await visit('/screener', 'body');
await visit('/news', 'body');
await visit('/options', 'body');
console.log(JSON.stringify(results,null,2));
await browser.close();
