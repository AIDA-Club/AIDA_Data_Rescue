// Trusted organizer machine only. Requires funded Vercel execution and the private dataset.
import {Sandbox} from '@vercel/sandbox';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
process.loadEnvFile('.env.local');
const {readState}=await import('../lib/store');
const {clock}=await import('../lib/rules');
const state=await readState();
if(!clock(state.event).finished)throw new Error('Finish the competition before judging.');
if(!process.env.AIDA_SANDBOX_SNAPSHOT)throw new Error('Configure the prepared Vercel snapshot.');
const credentials=process.env.VERCEL_TOKEN&&process.env.VERCEL_TEAM_ID&&process.env.VERCEL_PROJECT_ID?{token:process.env.VERCEL_TOKEN,teamId:process.env.VERCEL_TEAM_ID,projectId:process.env.VERCEL_PROJECT_ID}:{};
async function box(){return Sandbox.create({...credentials,source:{type:'snapshot',snapshotId:process.env.AIDA_SANDBOX_SNAPSHOT!},resources:{vcpus:2},timeout:180000,networkPolicy:'deny-all'});}
const teams=Object.values(state.teams).filter(t=>t.role==='team');
for(let start=0;start<teams.length;start+=3)await Promise.all(teams.slice(start,start+3).map(async team=>{
 const root=path.join('output/judging',team.id);await mkdir(root,{recursive:true});
 for(const stage of [1,2,3]){const submission=team.submissions[stage];if(!submission)continue;const dir=path.join(root,'stage'+stage);await mkdir(dir,{recursive:true});const run=await box();
 try{
  await run.runCommand({cmd:'mkdir',args:['-p','data','output']});
  const files=['equipment_dirty.csv','split_manifest.csv','data_dictionary.json',...(stage>=2?['maintenance_outcomes.csv']:[])];
  await run.writeFiles(await Promise.all(files.map(async name=>({path:'data/'+name,content:await readFile('data/participant/'+name)}))));
  await run.writeFiles([{path:'main.py',content:Buffer.from(submission.code)}]);
  const result=await run.runCommand({cmd:'timeout',args:['--signal=KILL','120','python','-u','main.py'],cwd:'/vercel/sandbox',env:{OMP_NUM_THREADS:'2',MPLBACKEND:'Agg'}});
  await writeFile(path.join(dir,'execution.txt'),(await result.stdout()).slice(-30000)+'\n'+(await result.stderr()).slice(-10000));
  await writeFile(path.join(dir,'notes.txt'),submission.notes);
  if(result.exitCode!==0)continue;
  for(const name of ['cleaned.csv','labeled.csv','quality.json','preprocessing.json','model.pt','model_config.json']){try{const b=await run.readFileToBuffer({path:'output/'+name});if(b&&b.length<=10_000_000)await writeFile(path.join(dir,name),b);}catch{}}
  if(stage===3){const inference=await box();try{
    await inference.runCommand({cmd:'mkdir',args:['-p','data','output']});
    await inference.writeFiles([{path:'infer.py',content:await readFile('python/infer.py')},{path:'data/test_features.csv',content:await readFile('data/private/test_features.csv')},{path:'data/data_dictionary.json',content:await readFile('data/participant/data_dictionary.json')},...await Promise.all(['preprocessing.json','model.pt','model_config.json'].map(async name=>({path:'output/'+name,content:await readFile(path.join(dir,name))})))]);
    const ir=await inference.runCommand({cmd:'timeout',args:['--signal=KILL','120','python','infer.py'],cwd:'/vercel/sandbox'});if(ir.exitCode!==0)throw new Error('Trusted inference failed');
    const predictions=await inference.readFileToBuffer({path:'output/predictions.csv'});if(predictions)await writeFile(path.join(dir,'predictions.csv'),predictions);
  }finally{await inference.stop();}}
 }catch(e){await writeFile(path.join(dir,'judge-error.txt'),String(e));}finally{await run.stop();}}
 const python=process.env.AIDA_JUDGE_PYTHON??(process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
 const result=spawnSync(python,['python/grade_artifacts.py',root],{encoding:'utf8'});if(result.status!==0)throw new Error('Trusted scoring failed: '+result.stderr);
 console.log(team.name+': provisional score saved. Review '+root+'/score.json');
}));
