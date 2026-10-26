import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';

const port=process.env.PORT??'3000';
const url=`http://aida.rescue:${port}`;
const healthUrl=`http://127.0.0.1:${port}`;
const next=path.join(process.cwd(),'node_modules','next','dist','bin','next');
const server=spawn(process.execPath,[next,'dev','--hostname','0.0.0.0','--port',port],{stdio:'inherit',env:process.env});

async function ready(){
  for(let attempt=0;attempt<120;attempt++){
    try{const response=await fetch(healthUrl,{redirect:'manual'});if(response.status<500)return true;}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  return false;
}
function openChrome(){
  if(process.env.AIDA_NO_BROWSER==='1')return;
  const candidates=process.platform==='win32'?[
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA??'','Google','Chrome','Application','chrome.exe')
  ]:[];
  const chrome=candidates.find(existsSync);
  if(chrome){console.log(`Opening ${url} in Google Chrome`);const profile=path.join(process.env.LOCALAPPDATA??process.env.TEMP??process.cwd(),'AIDA-Rescue-Chrome');spawn(chrome,[`--user-data-dir=${profile}`,'--host-resolver-rules=MAP aida.rescue 127.0.0.1',`--app=${url}`],{detached:true,stdio:'ignore'}).unref();return;}
  const command=process.platform==='darwin'?['open',['-a','Google Chrome',url]]:process.platform==='win32'?['cmd',['/c','start','chrome',url]]:['google-chrome',[url]];
  spawn(command[0],command[1],{detached:true,stdio:'ignore'}).unref();
}

if(await ready())openChrome();
else console.error(`AIDA started but did not become reachable at ${url}.`);

for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code??0));
