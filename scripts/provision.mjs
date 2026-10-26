// Run only after creating a dedicated Supabase project and applying schema.sql.
// Loads server credentials from .env.local; never prints or commits them.
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
process.loadEnvFile('.env.local');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const existing=await client.from('event_state').select('id').eq('id',1).maybeSingle();
if(existing.error)throw new Error('Apply supabase/schema.sql first.');
if(existing.data)throw new Error('Event already provisioned. Refusing to overwrite.');
const domain=process.env.AIDA_TEAM_EMAIL_DOMAIN;if(!domain)throw new Error('Set AIDA_TEAM_EMAIL_DOMAIN to an organizer-controlled email domain.');
const teams={},accounts=[];
fs.mkdirSync('.local',{recursive:true});
for(let i=0;i<=15;i++){
 const slug=i===0?'organizer':`team-${String(i).padStart(2,'0')}`,password=randomBytes(18).toString('base64url'),email=`aida-${slug}@${domain}`;
 const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});if(error)throw new Error('User provisioning failed; inspect project users before retrying.');
 const id=data.user.id;teams[id]={id,name:i===0?'Event Control':`Team ${i}`,role:i===0?'admin':'team',workspace:{code:'',notes:'',at:0},submissions:{},hints:{}};
 accounts.push({email,password});fs.writeFileSync('.local/team-credentials.json',JSON.stringify(accounts,null,2),{mode:0o600});
}
const payload={event:{startedAt:null,pausedAt:null,pausedMs:0,published:false},teams,sessions:{},audit:[],attempts:{}};
const {error}=await client.from('event_state').insert({id:1,version:0,payload});if(error)throw new Error('State initialization failed; existing users are retained.');
console.log('Provisioned 15 teams and one organizer. Credentials saved only to .local/team-credentials.json.');
