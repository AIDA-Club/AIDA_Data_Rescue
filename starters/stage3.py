# STAGE 3 | Basic starting example
import pandas as pd
import torch

torch.manual_seed(42)
data = pd.read_csv('output/labeled.csv')
print(data.head())
print('Rows and columns:', data.shape)

# Continue with your team's own model and training code.
