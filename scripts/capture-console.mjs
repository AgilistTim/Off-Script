import fs from 'fs';
import { chromium } from 'playwright';

const LOG_FILE = 'playwright-console.log';
fs.writeFileSync(LOG_FILE, `Playwright console capture started: ${new Date().toISOString()}\n`);

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const timestamp = new Date().toISOString();
    try {
      fs.appendFileSync(LOG_FILE, `${timestamp} [${msg.type()}] ${msg.text()}\n`);
    } catch (e) {
      // ignore
    }
  });

  page.on('pageerror', err => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `${timestamp} [pageerror] ${err.toString()}\n`);
  });

  const url = process.env.URL || 'http://localhost:5173';
  console.log(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Try to click the main CTA (Start your journey). Multiple fallbacks used.
  const ctaSelectors = [
    'button:has-text("Start your journey")',
    'button:has-text("Start Voice Chat")',
    'button:has-text("Start your journey")'
  ];

  for (const sel of ctaSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 3000 });
      console.log(`Clicking CTA: ${sel}`);
      await page.click(sel);
      break;
    } catch (e) {
      // continue
    }
  }

  // Wait for modal and click Text Chat
  try {
    await page.waitForSelector('button:has-text("Text Chat")', { timeout: 5000 });
    await page.click('button:has-text("Text Chat")');
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} [action] Clicked Text Chat\n`);
  } catch (e) {
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} [action] Failed to click Text Chat: ${e}\n`);
  }

  // Keep the session alive for a short period to capture console activity
  const captureTimeMs = parseInt(process.env.CAPTURE_MS || '15000', 10);
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} [info] Capturing for ${captureTimeMs}ms\n`);
  await page.waitForTimeout(captureTimeMs);

  await browser.close();
  fs.appendFileSync(LOG_FILE, `Playwright console capture ended: ${new Date().toISOString()}\n`);
}

capture().catch(err => {
  fs.appendFileSync(LOG_FILE, `Script error: ${err.toString()}\n`);
  console.error(err);
  process.exit(1);
});


