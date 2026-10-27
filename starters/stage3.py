# STAGE 3 | Train and Improve
# Minimal setup only. Your team must build, train, and evaluate the model.
import json

import numpy as np
import pandas as pd
import torch
from torch import nn

torch.set_num_threads(2)
torch.manual_seed(42)
np.random.seed(42)

data = pd.read_csv('output/labeled.csv')
with open('output/preprocessing.json', encoding='utf-8') as file:
    preprocessing = json.load(file)

features = preprocessing['features']
print('Rows:', len(data), '| Model inputs:', len(features))

# TODO: construct tensors without leakage, define the neural network,
# train for at most 50 epochs, evaluate validation accuracy and loss,
# and save the reproducible model, configuration, and metric history.
