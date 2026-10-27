import {cookies} from 'next/headers';
import {cloud,digest,readState,supabase} from './store';
export async function identity(){
 const cookie=(await cookies()).get('aida-session')?.value;
 if(!cookie)throw new Error('Please sign in');
 const statePromise=readState();
 if(cloud()){
  const [{data,error},state]=await Promise.all([supabase().auth.getClaims(cookie),statePromise]);
  const id=typeof data?.claims?.sub==='string'?data.claims.sub:'';
  if(error||!id)throw new Error('Session expired');
  if(!state.teams[id])throw new Error('Team not registered');
  return {id,state};
 }
 const state=await statePromise,session=state.sessions[digest(cookie)];
 if(!session||session.expires<Date.now())throw new Error('Session expired');
 return {id:session.teamId,state};
}
