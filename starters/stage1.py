# STAGE 1 | Rescue the Data
# Minimal setup only. Your team must design and implement the cleaning pipeline.
import json
from pathlib import Path

import numpy as np
import pandas as pd

Path('output').mkdir(exist_ok=True)
raw = pd.read_csv('data/equipment_dirty.csv')
split = pd.read_csv('data/split_manifest.csv')
with open('data/data_dictionary.json', encoding='utf-8') as file:
    dictionary = json.load(file)

print('Raw shape:', raw.shape)
print(raw.head())

# TODO: inspect the data and implement your own cleaning decisions.
# Required outputs: output/cleaned.csv and output/quality.json
