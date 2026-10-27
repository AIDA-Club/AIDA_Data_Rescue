# STAGE 2 | Build the Labels
# Minimal setup only. Continue below your Stage 1 work.
from pathlib import Path

import pandas as pd

cleaned_path = Path('output/cleaned.csv')
if cleaned_path.exists():
    records = pd.read_csv(cleaned_path)
else:
    print('Stage 1 did not create output/cleaned.csv; starting from the raw records.')
    records = pd.read_csv('data/equipment_dirty.csv')

outcomes = pd.read_csv('data/maintenance_outcomes.csv')
split = pd.read_csv('data/split_manifest.csv')
print('Records:', records.shape, '| Outcomes:', outcomes.shape)

# TODO: create labels, apply the fixed split, and design preprocessing.
# Required outputs: output/labeled.csv and output/preprocessing.json
