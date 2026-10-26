"""Organizer only: deterministic fictional data. Never deploy private outputs."""
from pathlib import Path
import json
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
FEATURES=['temperature_c','ambient_temperature_c','vibration_mm_s','current_a','voltage_v','humidity_pct','pressure_bar','rotation_rpm','daily_runtime_hours','equipment_age_months','days_since_service','load_pct']
RANGES=[(-10,150),(-10,60),(0,25),(0,100),(150,280),(0,100),(0,20),(0,6000),(0,24),(0,240),(0,1500),(0,100)]
UNITS=['C','C','mm/s','A','V','%','bar','rpm','h','months','days','%']

def generate():
    rng=np.random.default_rng(20261025); n=10000
    ranges=np.array([[25,95],[15,42],[.2,12],[3,45],[200,250],[15,90],[1,10],[300,4200],[1,23],[1,180],[1,900],[5,99]])
    x=rng.uniform(ranges[:,0],ranges[:,1],(n,12)); z=(x-ranges.mean(axis=1))/(ranges[:,1]-ranges[:,0])*2
    # Multiple interactions with modest irreducible noise, not one threshold.
    signal=3.5*(1.3*z[:,0]+1.6*z[:,2]+.8*z[:,6]+.6*z[:,8]+.8*z[:,9]+.9*z[:,10]+.6*z[:,11]+.9*z[:,2]*z[:,11]-.5*z[:,4])
    prob=1/(1+np.exp(-signal)); y=(rng.random(n)<prob).astype(int)
    ids=[f'EQ-{i+1:05d}' for i in range(n)]
    clean=pd.DataFrame(np.round(x,3),columns=FEATURES); clean.insert(0,'record_id',ids)
    idx=rng.permutation(n); train=idx[:6000];val=idx[6000:8000];test=idx[8000:]
    development=np.r_[train,val]
    manifest=pd.DataFrame({'record_id':np.array(ids)[development],'split':['train']*6000+['validation']*2000})
    dirty=clean.astype(object).copy(); corruption=[]
    for i in range(n):
        if rng.random()<.18: dirty.at[i,'record_id']=' '+ids[i].lower().replace('-',' - ')+' '
        for j,f in enumerate(FEATURES):
            r=rng.random();kind=None
            if r<.05: dirty.at[i,f]='';kind='missing'
            elif r<.06: dirty.at[i,f]=RANGES[j][1]*10+100;kind='invalid_range'
            elif r<.16: dirty.at[i,f]=f' {x[i,j]:.3f} {UNITS[j]} ';kind='unit_string'
            if kind:corruption.append({'record_id':ids[i],'feature':f,'kind':kind})
    participant=ROOT/'data/participant';private=ROOT/'data/private'
    participant.mkdir(parents=True,exist_ok=True);private.mkdir(parents=True,exist_ok=True)
    dev=dirty.iloc[development].copy();dups=dev.iloc[rng.choice(len(dev),200,replace=False)]
    pd.concat([dev,dups],ignore_index=True).sample(frac=1,random_state=42).to_csv(participant/'equipment_dirty.csv',index=False)
    manifest.to_csv(participant/'split_manifest.csv',index=False)
    logs=[]
    for i in development:
        status='corrective repair confirmed' if y[i] else 'inspection complete — no corrective repair'
        if rng.random()<.3:status=status.upper()
        if rng.random()<.3:status='  '+status.replace(' ','  ')+' '
        rid=ids[i] if rng.random()>.3 else ' '+ids[i].lower().replace('-',' - ')+' '
        logs.append({'record_id':rid,'maintenance_status':status})
    pd.DataFrame(logs).sample(frac=1,random_state=8).to_csv(participant/'maintenance_outcomes.csv',index=False)
    dictionary={f:{'unit':u,'min':lo,'max':hi} for f,(lo,hi),u in zip(FEATURES,RANGES,UNITS)}
    (participant/'data_dictionary.json').write_text(json.dumps(dictionary,indent=2))
    clean['needs_maintenance']=y;clean.to_csv(private/'clean_reference.csv',index=False)
    clean.iloc[test][['record_id','needs_maintenance']].to_csv(private/'test_labels.csv',index=False)
    dirty.iloc[test].to_csv(private/'test_features.csv',index=False)
    pd.DataFrame({'record_id':np.array(ids)[development],'needs_maintenance':y[development]}).to_csv(private/'development_labels.csv',index=False)
    pd.DataFrame(corruption).to_csv(private/'corruption_manifest.csv',index=False)
    summary={'seed':20261025,'unique_records':n,'public_rows':8200,'features':12,'train':6000,'validation':2000,'private_test':2000,'log_rows':8000,'positive_rate':float(y.mean()),'missing_fraction':sum(c['kind']=='missing' for c in corruption)/(n*12)}
    (private/'generation_summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
if __name__=='__main__':generate()
