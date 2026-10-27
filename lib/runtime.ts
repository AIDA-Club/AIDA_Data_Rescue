import {Sandbox} from '@vercel/sandbox';
import {spawn,type ChildProcess} from 'node:child_process';
import {closeSync,existsSync,openSync} from 'node:fs';
import {copyFile,mkdir,readFile as readLocalFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {readState,mutate,cloud,supabase} from './store';
import {teamClock} from './rules';

const hasExplicitCredentials=()=>!!(process.env.VERCEL_TOKEN&&process.env.VERCEL_TEAM_ID&&process.env.VERCEL_PROJECT_ID);
const credentials=()=>hasExplicitCredentials()?{token:process.env.VERCEL_TOKEN!,teamId:process.env.VERCEL_TEAM_ID!,projectId:process.env.VERCEL_PROJECT_ID!}:{};
const localReview=()=>process.env.AIDA_LOCAL_DEMO==='true'&&!process.env.VERCEL;
const remoteReady=()=>!!(process.env.AIDA_SANDBOX_SNAPSHOT&&(process.env.VERCEL||process.env.VERCEL_OIDC_TOKEN||hasExplicitCredentials()));
export const runtimeReady=()=>localReview()||remoteReady();
const localRuns=new Map<string,{child:ChildProcess;dir:string;timer:ReturnType<typeof setTimeout>}>();

function localDir(teamId:string){return path.join(process.cwd(),'.local','runtime',teamId);}
function pythonPath(){
  if(process.env.AIDA_LOCAL_PYTHON)return process.env.AIDA_LOCAL_PYTHON;
  const candidate=process.platform==='win32'?path.join(process.cwd(),'.venv','Scripts','python.exe'):path.join(process.cwd(),'.venv','bin','python');
  return existsSync(candidate)?candidate:(process.platform==='win32'?'python':'python3');
}
async function prepareLocal(teamId:string){
  const dir=localDir(teamId),data=path.join(dir,'data'),output=path.join(dir,'output');
  await mkdir(data,{recursive:true});await mkdir(output,{recursive:true});
  const s=await readState(),names=['equipment_dirty.csv','split_manifest.csv','data_dictionary.json'];
  if(teamClock(s.event,s.teams[teamId].submissions).stage>=2)names.push('maintenance_outcomes.csv');
  await Promise.all(names.map(name=>copyFile(path.join(process.cwd(),'data','participant',name),path.join(data,name))));
  await writeFile(path.join(dir,'main.py'),s.teams[teamId].workspace.code||'# Add your Python solution here.\n');
  return dir;
}
async function runLocal(teamId:string,code:string){
  const dir=await prepareLocal(teamId),stdout=path.join(dir,'stdout.log'),stderr=path.join(dir,'stderr.log'),status=path.join(dir,'status.json');
  await Promise.all([writeFile(path.join(dir,'main.py'),code),writeFile(stdout,''),writeFile(stderr,''),writeFile(status,JSON.stringify({running:true,startedAt:Date.now()}))]);
  const outFd=openSync(stdout,'a'),errFd=openSync(stderr,'a');
  const runtimeEnv:NodeJS.ProcessEnv={NODE_ENV:process.env.NODE_ENV??'development',PATH:process.env.PATH??'',SYSTEMROOT:process.env.SYSTEMROOT??'',WINDIR:process.env.WINDIR??'',TEMP:process.env.TEMP??'',TMP:process.env.TMP??'',OMP_NUM_THREADS:'2',MPLBACKEND:'Agg',PYTHONNOUSERSITE:'1'};
  const child=spawn(pythonPath(),['-u','main.py'],{cwd:dir,windowsHide:true,shell:false,stdio:['ignore',outFd,errFd],env:runtimeEnv}) as ChildProcess;
  closeSync(outFd);closeSync(errFd);
  const finish=async(exitCode:number|null,reason:string)=>{clearTimeout(localRuns.get(teamId)?.timer);localRuns.delete(teamId);await writeFile(status,JSON.stringify({running:false,exitCode,reason,finishedAt:Date.now()}));};
  child.once('error',(e:Error)=>{void finish(null,e.message);});
  child.once('close',(code:number|null)=>{void finish(code,code===0?'completed':`Python exited with code ${code}`);});
  const timer=setTimeout(()=>{if(child.exitCode===null){child.kill();void writeFile(status,JSON.stringify({running:false,exitCode:null,reason:'Stopped after the 120-second limit',finishedAt:Date.now()}));}},120000);
  localRuns.set(teamId,{child,dir,timer});
  await mutate(s=>{Object.assign(s.teams[teamId],{sandboxId:'local-review',runId:`local-${Date.now()}`,output:'Running Python locally for this trusted review…'});});
  return {runId:`local-${child.pid}`};
}

export async function connect(id:string){return Sandbox.get({name:id,...credentials()});}
export async function startRuntime(teamId:string){
  if(localReview()){await prepareLocal(teamId);return;}
  if(!remoteReady())throw new Error('Python runtime is not configured. Add the prebuilt Vercel Sandbox snapshot. Your code is saved.');
  const s=await readState(),t=s.teams[teamId];if(t.sandboxId){try{return await connect(t.sandboxId);}catch{/* Restore from durable workspace below. */}}
  const box=await Sandbox.create({...credentials(),source:{type:'snapshot',snapshotId:process.env.AIDA_SANDBOX_SNAPSHOT!},resources:{vcpus:2},timeout:20*60*1000,networkPolicy:'deny-all'});await box.runCommand({cmd:'mkdir',args:['-p','/vercel/sandbox/data','/vercel/sandbox/output']});const names=['equipment_dirty.csv','split_manifest.csv','data_dictionary.json'];if(teamClock(s.event,t.submissions).stage>=2)names.push('maintenance_outcomes.csv');await box.writeFiles(await Promise.all(names.map(async name=>({path:`/vercel/sandbox/data/${name}`,content:await readLocalFile(path.join(process.cwd(),'data/participant',name))}))));await box.writeFiles([{path:'/vercel/sandbox/main.py',content:Buffer.from(t.workspace.code)}]);await mutate(s=>{s.teams[teamId].sandboxId=box.name;});return box;
}
export async function runCode(teamId:string,code:string){
  await mutate(s=>{const c=teamClock(s.event,s.teams[teamId].submissions);if(!c.active)throw new Error('Stage is not active');if(s.teams[teamId].running)throw new Error('A run is already active');s.teams[teamId].running=true;});
  try{
    if(localReview())return await runLocal(teamId,code);
    const box=await startRuntime(teamId);if(!box)throw new Error('Runtime did not start');const s=await readState();if(teamClock(s.event,s.teams[teamId].submissions).stage>=2)await box.writeFiles([{path:'/vercel/sandbox/data/maintenance_outcomes.csv',content:await readLocalFile('data/participant/maintenance_outcomes.csv')}]);await box.writeFiles([{path:'/vercel/sandbox/main.py',content:Buffer.from(code)}]);const run=await box.runCommand({cmd:'timeout',args:['--signal=KILL','120','python','-u','main.py'],cwd:'/vercel/sandbox',detached:true,env:{OMP_NUM_THREADS:'2',MPLBACKEND:'Agg'}});await mutate(s=>{s.teams[teamId].runId=run.cmdId;s.teams[teamId].output='Running Python…';});return {runId:run.cmdId};
  }catch(e){await mutate(s=>{s.teams[teamId].running=false;});throw e;}
}

export async function resetLocalRuntime(){
  if(!localReview())return;
  for(const run of localRuns.values()){clearTimeout(run.timer);if(run.child.exitCode===null)run.child.kill();}
  localRuns.clear();
  const root=path.resolve(process.cwd(),'.local','runtime');
  const expected=path.resolve(process.cwd(),'.local');
  if(!root.startsWith(expected+path.sep))throw new Error('Invalid local runtime path');
  await rm(root,{recursive:true,force:true});
}
export async function pollRun(teamId:string){
  if(localReview()){
    const live=localRuns.get(teamId);if(live?.child.exitCode===null)return {output:'Python is running. Results appear when the run finishes (maximum 120 seconds).',running:true};
    const dir=localDir(teamId);let status:{running:boolean;reason?:string}={running:false};try{status=JSON.parse(await readLocalFile(path.join(dir,'status.json'),'utf8'));}catch{}
    if(status.running)return {output:'Python is starting…',running:true};
    const output=((await readLocalFile(path.join(dir,'stdout.log'),'utf8').catch(()=>''))+'\n'+(await readLocalFile(path.join(dir,'stderr.log'),'utf8').catch(()=>''))).slice(-30000)||status.reason||'Run completed with no console output.';
    let metrics:unknown=null;try{metrics=JSON.parse(await readLocalFile(path.join(dir,'output','history.json'),'utf8'));}catch{}
    await mutate(s=>{Object.assign(s.teams[teamId],{output,running:false,metrics});});return {output,running:false,metrics};
  }
  const t=(await readState()).teams[teamId];if(!t.sandboxId||!t.runId)return {output:t.output??'',running:false};
  try{const box=await connect(t.sandboxId),cmd=await box.getCommand(t.runId);let finished;try{finished=await cmd.wait({signal:AbortSignal.timeout(1000)});}catch{return {output:'Python is running. Results appear when the run finishes (maximum 120 seconds).',running:true};}const output=((await finished.stdout())+'\n'+(await finished.stderr())).slice(-30000)||'Run completed with no console output.';let metrics:unknown=null;try{const f=await box.readFileToBuffer({path:'/vercel/sandbox/output/history.json'});metrics=f?JSON.parse(f.toString()):null;}catch{}await mutate(s=>{Object.assign(s.teams[teamId],{output,running:false,metrics});});return {output,running:false,metrics};}
  catch{const output='The Python session disconnected. Your code is saved; select Start Python to create a fresh compiler.';await mutate(s=>{Object.assign(s.teams[teamId],{output,running:false});delete s.teams[teamId].runId;delete s.teams[teamId].sandboxId;});return {output,running:false};}
}
export async function stopRun(teamId:string){
  if(localReview()){const run=localRuns.get(teamId);if(run){clearTimeout(run.timer);run.child.kill();localRuns.delete(teamId);await writeFile(path.join(run.dir,'status.json'),JSON.stringify({running:false,exitCode:null,reason:'Stopped by the team',finishedAt:Date.now()}));}await mutate(s=>{s.teams[teamId].running=false;});return;}
  const t=(await readState()).teams[teamId];if(t.sandboxId&&t.runId){try{const box=await connect(t.sandboxId);await (await box.getCommand(t.runId)).kill();}catch{/* A disconnected command is already stopped. */}}await mutate(s=>{s.teams[teamId].running=false;delete s.teams[teamId].runId;});
}
export async function refreshRuntime(teamId:string){
  if(localReview()){
    const run=localRuns.get(teamId);if(run){clearTimeout(run.timer);if(run.child.exitCode===null)run.child.kill();localRuns.delete(teamId);}
    await rm(localDir(teamId),{recursive:true,force:true});
  }else{
    const t=(await readState()).teams[teamId];
    if(t?.sandboxId){try{const box=await connect(t.sandboxId);await box.delete({deleteOrphanSnapshots:true});}catch{/* Missing and expired runtimes are already replaceable. */}}
  }
  await mutate(s=>{const t=s.teams[teamId];if(!t)return;t.running=false;delete t.runId;delete t.sandboxId;delete t.output;delete t.metrics;});
}
export async function checkpointRuntime(teamId:string){
  if(localReview())return;
  const t=(await readState()).teams[teamId];
  if(t.sandboxId){try{const box=await connect(t.sandboxId);await box.stop();}catch{/* An expired session is already checkpointed. */}}
  await mutate(s=>{s.teams[teamId].running=false;delete s.teams[teamId].runId;});
}
export async function collectArtifacts(teamId:string,receipt:string){
  if(localReview()){
    const artifacts:Record<string,string>={},source=path.join(localDir(teamId),'output'),dest=path.join(process.cwd(),'.local','artifacts',teamId,receipt);await mkdir(dest,{recursive:true});
    for(const name of ['cleaned.csv','labeled.csv','quality.json','preprocessing.json','model.pt','model_config.json','history.json'])try{const b=await readLocalFile(path.join(source,name));if(b.length>10_000_000)continue;await writeFile(path.join(dest,name),b);artifacts[name]=`${teamId}/${receipt}/${name}`;}catch{}
    return artifacts;
  }
  const t=(await readState()).teams[teamId];if(!t.sandboxId)return {};const box=await connect(t.sandboxId),artifacts:Record<string,string>={};for(const name of ['cleaned.csv','labeled.csv','quality.json','preprocessing.json','model.pt','model_config.json','history.json']){try{const b=await box.readFileToBuffer({path:`/vercel/sandbox/output/${name}`});if(!b||b.length>10_000_000)continue;const key=`${teamId}/${receipt}/${name}`;if(cloud()){const {error}=await supabase().storage.from('aida-artifacts').upload(key,b,{upsert:false});if(error)throw error;artifacts[name]=key;}else{const dir=path.join(process.cwd(),'.local/artifacts',teamId,receipt);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,name),b);artifacts[name]=key;}}catch{/* Missing optional artifacts are recorded by the judge. */}}return artifacts;
}
