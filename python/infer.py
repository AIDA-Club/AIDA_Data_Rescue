"""Trusted inference in a fresh sandbox. No test labels are supplied here."""
import json
import numpy as np
import pandas as pd
import torch
from torch import nn
torch.set_num_threads(2)
with open('output/preprocessing.json') as f:prep=json.load(f)
with open('output/model_config.json') as f:cfg=json.load(f)
with open('data/data_dictionary.json') as f:dictionary=json.load(f)
features=list(dictionary)
assert prep['features']==features
hidden=cfg['hidden'];assert len(hidden)==2 and all(isinstance(h,int) and 4<=h<=64 for h in hidden)
assert 0<=cfg['dropout']<=.5 and 1<=cfg['epochs']<=50
df=pd.read_csv('data/test_features.csv')
df.record_id=df.record_id.str.upper().str.replace(r'\s+','',regex=True)
for f in features:
    df[f]=pd.to_numeric(df[f].astype(str).str.extract(r'(-?\d+(?:\.\d+)?)',expand=False),errors='coerce')
    df.loc[~df[f].between(dictionary[f]['min'],dictionary[f]['max']),f]=np.nan
means=pd.Series(prep['mean']);std=pd.Series(prep['std']);medians=pd.Series(prep['median'])
assert np.isfinite(means).all() and np.isfinite(std).all() and (std>0).all()
X=torch.tensor(((df[features].fillna(medians)-means)/std).values,dtype=torch.float32)
model=nn.Sequential(nn.Linear(12,hidden[0]),nn.ReLU(),nn.Dropout(cfg['dropout']),nn.Linear(hidden[0],hidden[1]),nn.ReLU(),nn.Dropout(cfg['dropout']),nn.Linear(hidden[1],1))
model.load_state_dict(torch.load('output/model.pt',map_location='cpu',weights_only=True));model.eval()
with torch.no_grad():probs=torch.sigmoid(model(X)).numpy().ravel()
assert np.isfinite(probs).all()
pd.DataFrame({'record_id':df.record_id,'probability':probs}).to_csv('output/predictions.csv',index=False)
