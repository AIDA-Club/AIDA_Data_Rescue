"""Organizer-only reference. Do not distribute before the competition."""
from pathlib import Path
import json,time,copy
import numpy as np
import pandas as pd
import torch
from torch import nn
from generate_dataset import FEATURES,RANGES,ROOT
torch.set_num_threads(2)
def normalize_ids(s):return s.astype(str).str.upper().str.replace(r'\s+','',regex=True)
def clean_frame(df):
    df=df.copy();df['record_id']=normalize_ids(df.record_id);df=df.drop_duplicates('record_id')
    for f,(lo,hi) in zip(FEATURES,RANGES):
        df[f]=pd.to_numeric(df[f].astype(str).str.extract(r'(-?\d+(?:\.\d+)?)',expand=False),errors='coerce')
        df.loc[~df[f].between(lo,hi),f]=np.nan
    return df
def run():
    begin=time.time();torch.manual_seed(42);np.random.seed(42)
    out=ROOT/'output/reference';out.mkdir(parents=True,exist_ok=True)
    raw=pd.read_csv(ROOT/'data/participant/equipment_dirty.csv');df=clean_frame(raw)
    split=pd.read_csv(ROOT/'data/participant/split_manifest.csv');df=df.merge(split,on='record_id',validate='one_to_one')
    med=df.loc[df.split=='train',FEATURES].median();df[FEATURES]=df[FEATURES].fillna(med)
    df[['record_id']+FEATURES].to_csv(out/'cleaned.csv',index=False)
    logs=pd.read_csv(ROOT/'data/participant/maintenance_outcomes.csv');logs.record_id=normalize_ids(logs.record_id)
    normalized=logs.maintenance_status.str.lower().str.replace(r'\s+',' ',regex=True).str.strip()
    logs['needs_maintenance']=normalized.map({'corrective repair confirmed':1,'inspection complete — no corrective repair':0})
    assert logs.needs_maintenance.notna().all()
    df=df.merge(logs[['record_id','needs_maintenance']],on='record_id',validate='one_to_one')
    df.to_csv(out/'labeled.csv',index=False)
    train=df.split=='train';val=~train;mean=df.loc[train,FEATURES].mean();std=df.loc[train,FEATURES].std(ddof=0).replace(0,1)
    prep={'features':FEATURES,'median':med.to_dict(),'mean':mean.to_dict(),'std':std.to_dict(),'fitted_ids':df.loc[train,'record_id'].tolist()}
    (out/'preprocessing.json').write_text(json.dumps(prep))
    xt=torch.tensor(((df.loc[train,FEATURES]-mean)/std).values,dtype=torch.float32);xv=torch.tensor(((df.loc[val,FEATURES]-mean)/std).values,dtype=torch.float32)
    yt=torch.tensor(df.loc[train,'needs_maintenance'].values,dtype=torch.float32).view(-1,1);yv=torch.tensor(df.loc[val,'needs_maintenance'].values,dtype=torch.float32).view(-1,1)
    model=nn.Sequential(nn.Linear(12,16),nn.ReLU(),nn.Linear(16,8),nn.ReLU(),nn.Linear(8,1));optimizer=torch.optim.Adam(model.parameters(),lr=.003,weight_decay=.0001);criterion=nn.BCEWithLogitsLoss();history=[];best=float('inf');weights=None
    for epoch in range(1,41):
        model.train();order=torch.randperm(len(xt))
        for batch in order.split(128):optimizer.zero_grad();loss=criterion(model(xt[batch]),yt[batch]);loss.backward();optimizer.step()
        model.eval()
        with torch.no_grad():tl=criterion(model(xt),yt).item();vl=criterion(model(xv),yv).item();acc=((model(xv)>=0)==yv.bool()).float().mean().item()
        history.append({'epoch':epoch,'train_loss':tl,'val_loss':vl,'accuracy':acc})
        if vl<best:best=vl;weights=copy.deepcopy(model.state_dict())
    model.load_state_dict(weights);torch.save(weights,out/'model.pt')
    (out/'model_config.json').write_text(json.dumps({'hidden':[16,8],'dropout':0,'epochs':40,'seed':42}))
    (out/'history.json').write_text(json.dumps(history));(out/'quality.json').write_text(json.dumps({'raw_rows':8200,'clean_rows':8000,'duplicates_removed':200,'missing_after':0,'strategy':'Training-only median; range violations treated as missing'}))
    test=clean_frame(pd.read_csv(ROOT/'data/private/test_features.csv'));labels=pd.read_csv(ROOT/'data/private/test_labels.csv');test=test.merge(labels,on='record_id',validate='one_to_one');xx=torch.tensor(((test[FEATURES].fillna(med)-mean)/std).values,dtype=torch.float32);yy=torch.tensor(test.needs_maintenance.values,dtype=torch.float32).view(-1,1)
    with torch.no_grad():pred=model(xx);testloss=criterion(pred,yy).item();testacc=((pred>=0)==yy.bool()).float().mean().item()
    result={'validation_accuracy':max(h['accuracy'] for h in history),'best_validation_loss':best,'private_test_accuracy':testacc,'private_test_loss':testloss,'runtime_seconds':time.time()-begin};(out/'baseline_report.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
if __name__=='__main__':run()
