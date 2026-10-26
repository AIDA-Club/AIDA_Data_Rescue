import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('output/screenshots');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1680, height: 945 }, deviceScaleFactor: 1 });

try {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(output, '01-welcome-ui.png'), fullPage: true });

  await page.getByLabel('Team ID').fill('team-02');
  await page.getByLabel('Access code').fill('AIDA-02');
  await page.getByRole('button', { name: 'Join workspace' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(output, '02-blue-block-void.png') });

  await page.waitForTimeout(1700);
  await page.screenshot({ path: path.join(output, '03-workspace-ui.png'), fullPage: true });

  await page.getByRole('button', { name: 'Guide' }).last().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(output, '04-guide-ui.png') });
} finally {
  await browser.close();
}

console.log(`Saved UI captures to ${output}`);
