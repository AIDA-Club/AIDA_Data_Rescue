# STAGE 1 | Rescue the Data
# Work in /vercel/sandbox. Save deliverables under output/.
import os, json
import numpy as np
import pandas as pd
os.makedirs('output', exist_ok=True)
raw = pd.read_csv('data/equipment_dirty.csv')
split = pd.read_csv('data/split_manifest.csv')
with open('data/data_dictionary.json') as f:
    dictionary = json.load(f)
FEATURES = list(dictionary)
print(raw.head())
print(raw.info())
print('Raw rows:', len(raw))
print('Missing values:', raw.isna().sum())
# TODO: normalize IDs; remove duplicate copies; parse numbers and units.
# TODO: use the dictionary to replace impossible readings with NaN.
# TODO: use ONLY IDs marked train in split_manifest to learn medians.
# TODO: fill missing values using those medians; preserve 8,000 unique IDs.
# Save cleaned.csv with record_id + 12 features (no target yet):
# cleaned.to_csv('output/cleaned.csv', index=False)
# Save quality.json with raw_rows, clean_rows, duplicates_removed,
# missing_after, and a short strategy description.
