import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const base='http://127.0.0.1:3000/api/';
const login=async(team,code)=>{const response=await fetch(base+'login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({team,code})});if(!response.ok)throw new Error(await response.text());return response.headers.get('set-cookie').split(';')[0];};
const call=async(cookie,action,body)=>{const response=await fetch(base+action,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());};
const admin=await login('admin','AIDA-ADMIN-LOCAL');
await call(admin,'admin',{action:'reset-review'});
for(let index=0;index<3;index++)await call(admin,'admin',{action:'next-stage'});

const output=path.resolve('output/screenshots');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
try{
  const page=await browser.newPage({viewport:{width:1680,height:945}});
  await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
  await page.getByLabel('Team ID').fill('team-03');
  await page.getByLabel('Access code').fill('AIDA-03');
  await page.getByRole('button',{name:'Join workspace'}).click();
  await page.waitForTimeout(900);
  await page.screenshot({path:path.join(output,'05-completion-popup.png')});
  await page.waitForTimeout(2300);
  await page.screenshot({path:path.join(output,'06-results-judging.png')});
}finally{
  await browser.close();
  await call(admin,'admin',{action:'reset-review'});
}
console.log(`Saved finale captures to ${output}`);
