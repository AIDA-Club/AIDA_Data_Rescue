// Requires the organizer's funded Vercel project. No student code runs here.
import {Sandbox} from '@vercel/sandbox';
import fs from 'node:fs/promises';
process.loadEnvFile('.env.local');
const explicit=process.env.VERCEL_TOKEN&&process.env.VERCEL_TEAM_ID&&process.env.VERCEL_PROJECT_ID?{token:process.env.VERCEL_TOKEN,teamId:process.env.VERCEL_TEAM_ID,projectId:process.env.VERCEL_PROJECT_ID}:{};
const box=await Sandbox.create({...explicit,runtime:'python3.13',resources:{vcpus:2},timeout:15*60*1000});
try{
 await box.writeFiles([{path:'/vercel/sandbox/requirements.txt',content:await fs.readFile('python/requirements.txt')}]);
 const r=await box.runCommand({cmd:'python',args:['-m','pip','install','--no-cache-dir','-r','requirements.txt','--extra-index-url','https://download.pytorch.org/whl/cpu'],cwd:'/vercel/sandbox'});
 if(r.exitCode!==0)throw new Error(`Package installation failed:\n${(await r.stderr()).slice(-3000)}`);
 const verify=await box.runCommand({cmd:'python',args:['-c',`import json, numpy, pandas, scipy, sklearn, matplotlib, seaborn, torch
print(json.dumps({'numpy':numpy.__version__,'pandas':pandas.__version__,'scipy':scipy.__version__,'sklearn':sklearn.__version__,'matplotlib':matplotlib.__version__,'seaborn':seaborn.__version__,'torch':torch.__version__}))`],cwd:'/vercel/sandbox'});
 if(verify.exitCode!==0)throw new Error(`Library verification failed:\n${(await verify.stderr()).slice(-3000)}`);
 console.log('Verified compiler libraries:',await verify.stdout());
 await box.updateNetworkPolicy('deny-all');
 const snap=await box.snapshot();
 console.log('Set AIDA_SANDBOX_SNAPSHOT to:',snap.snapshotId);
}finally{await box.stop();}
