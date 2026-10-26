# STAGE 3 | Train and Improve -- append after your labeling code.
import copy, json, os
import numpy as np
import pandas as pd
import torch
from torch import nn
torch.set_num_threads(2)
torch.manual_seed(42)
np.random.seed(42)
data = pd.read_csv('output/labeled.csv')
with open('output/preprocessing.json') as f:
    prep = json.load(f)
features = prep['features']
assert len(features) == 12 and 'needs_maintenance' not in features
mean = pd.Series(prep['mean']); std = pd.Series(prep['std'])
train = data['split'].eq('train'); val = data['split'].eq('validation')
X = torch.tensor(((data[features]-mean)/std).values, dtype=torch.float32)
y = torch.tensor(data.needs_maintenance.values, dtype=torch.float32).reshape(-1,1)
xt, xv = X[train.values], X[val.values]
yt, yv = y[train.values], y[val.values]
# TODO: change these settings and explain two experiments in your notes.
LEARNING_RATE = 0.003
EPOCHS = 30                  # maximum 50
BATCH_SIZE = 128
HIDDEN = [16, 8]             # exactly two layers, each 4 to 64 units
DROPOUT = 0.0               # 0 to 0.5
WEIGHT_DECAY = 0.0001
assert 1 <= EPOCHS <= 50 and all(4 <= h <= 64 for h in HIDDEN)
model = nn.Sequential(nn.Linear(12,HIDDEN[0]),nn.ReLU(),nn.Dropout(DROPOUT),
                      nn.Linear(HIDDEN[0],HIDDEN[1]),nn.ReLU(),nn.Dropout(DROPOUT),nn.Linear(HIDDEN[1],1))
optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
loss_fn = nn.BCEWithLogitsLoss()
history=[]; best=float('inf'); best_weights=None; stale=0
for epoch in range(1,EPOCHS+1):
    model.train()
    for batch in torch.randperm(len(xt)).split(BATCH_SIZE):
        optimizer.zero_grad(); loss=loss_fn(model(xt[batch]),yt[batch]); loss.backward(); optimizer.step()
    model.eval()
    with torch.no_grad():
        train_loss=loss_fn(model(xt),yt).item()
        logits=model(xv); val_loss=loss_fn(logits,yv).item()
        accuracy=((logits>=0)==yv.bool()).float().mean().item()
    history.append(dict(epoch=epoch,train_loss=train_loss,val_loss=val_loss,accuracy=accuracy))
    print(f'Epoch {epoch:02d} | train {train_loss:.4f} | val {val_loss:.4f} | accuracy {accuracy:.1%}')
    if val_loss < best:
        best=val_loss; best_weights=copy.deepcopy(model.state_dict()); stale=0
    else:
        stale+=1
    if stale>=7: break
model.load_state_dict(best_weights)
torch.save(model.state_dict(),'output/model.pt')
with open('output/model_config.json','w') as f: json.dump(dict(hidden=HIDDEN,dropout=DROPOUT,epochs=EPOCHS,seed=42),f)
with open('output/history.json','w') as f: json.dump(history,f)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.plot([h['train_loss'] for h in history],label='Training')
plt.plot([h['val_loss'] for h in history],label='Validation')
plt.xlabel('Epoch');plt.ylabel('Binary cross entropy');plt.legend();plt.savefig('output/loss.png')
print('Model and training history saved. Finish with Submit Stage.')
