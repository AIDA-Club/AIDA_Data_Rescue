import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const base='http://127.0.0.1:3000/api/';
const login=async(team,code)=>{const response=await fetch(base+'login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({team,code})});if(!response.ok)throw new Error(await response.text());return response.headers.get('set-cookie').split(';')[0];};
const call=async(cookie,action,body,method='POST')=>{const response=await fetch(base+action,{method,headers:{cookie,'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json();};
const admin=await login('admin','AIDA-ADMIN-LOCAL');
const output=path.resolve('output/screenshots');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});

try{
  await call(admin,'admin',{action:'reset-review'});
  const transitionPage=await browser.newPage({viewport:{width:1680,height:945}});
  await transitionPage.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
  await transitionPage.getByLabel('Team ID').fill('demo-01');
  await transitionPage.getByLabel('Access code').fill('AIDA-DEMO-01');
  await transitionPage.getByRole('button',{name:'Join workspace'}).click();
  await transitionPage.waitForTimeout(2400);
  await transitionPage.getByRole('button',{name:/Submit stage/i}).click();
  await transitionPage.getByLabel('Quality report / experiment notes').fill('Practice submission used to review the stage transition.');
  await transitionPage.getByRole('button',{name:/Confirm submission/i}).click();
  await transitionPage.waitForTimeout(800);
  await transitionPage.screenshot({path:path.join(output,'07-black-hole-stage-transition.png')});
  await transitionPage.close();

  await call(admin,'admin',{action:'reset-review'});
  const team3=await login('team-03','AIDA-03');
  await call(team3,'submit',{code:"import pandas as pd\ndf=pd.read_csv('equipment_dirty.csv')\ndf=df.drop_duplicates('record_id')\nfor col in df.columns[1:]: df[col]=pd.to_numeric(df[col],errors='coerce')\n# replace impossible ranges and impute from training rows",notes:'Parsed numeric units, removed duplicate record IDs, converted invalid ranges to missing, and fit median imputation on training rows.',stage:1});
  await call(team3,'submit',{code:"log=pd.read_csv('maintenance_outcomes.csv')\n# normalize both IDs and status text\nlabeled=df.merge(log,on='record_id',validate='one_to_one')\n# create binary target; preserve unmatched rows for review\n# fit scaler on fixed training split only",notes:'Normalized both join keys and status strings, flagged unmatched records, followed the manifest, and excluded ID, outcome text, and target from model inputs.',stage:2});
  await call(team3,'submit',{code:"import torch\ntorch.manual_seed(42)\nmodel=torch.nn.Sequential(torch.nn.Linear(12,24),torch.nn.ReLU(),torch.nn.Dropout(.15),torch.nn.Linear(24,8),torch.nn.ReLU(),torch.nn.Linear(8,1))\nloss_fn=torch.nn.BCEWithLogitsLoss()\n# early stopping saves the best state_dict and preprocessing artifacts",notes:'Experiment 1 used learning rate 0.001 and reached 86% validation accuracy. Experiment 2 added dropout 0.15 and early stopping, reaching 89% accuracy with 0.34 validation loss.',stage:3});
  for(let index=0;index<3;index++)await call(admin,'admin',{action:'next-stage'});
  await call(admin,'admin',{action:'score',teamId:'team-01',score:{stage1:29,stage2:29,stage3:39,accuracy:.92,loss:.28,reason:'AI judge final score for concept capture'}});
  await call(admin,'admin',{action:'score',teamId:'team-02',score:{stage1:27,stage2:28,stage3:37,accuracy:.89,loss:.32,reason:'AI judge final score for concept capture'}});
  await call(admin,'admin',{action:'score',teamId:'team-03',score:{stage1:26,stage2:27,stage3:36,accuracy:.87,loss:.35,reason:'AI judge final score for concept capture'}});
  await call(admin,'admin',{action:'publish'});

  const resultsPage=await browser.newPage({viewport:{width:1680,height:945}});
  await resultsPage.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
  await resultsPage.getByLabel('Team ID').fill('team-03');
  await resultsPage.getByLabel('Access code').fill('AIDA-03');
  await resultsPage.getByRole('button',{name:'Join workspace'}).click();
  await resultsPage.waitForTimeout(3200);
  await resultsPage.screenshot({path:path.join(output,'08-ai-score-five-second-wait.png'),fullPage:true});
  await resultsPage.waitForTimeout(5000);
  await resultsPage.screenshot({path:path.join(output,'09-top-three-after-five-seconds.png'),fullPage:true});
  await resultsPage.close();
}finally{
  await browser.close();
  await call(admin,'admin',{action:'reset-review'}).catch(()=>{});
}

console.log(`Saved judge UI captures to ${output}`);
