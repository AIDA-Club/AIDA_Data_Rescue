# STAGE 2 | Basic starting example
from pathlib import Path
import pandas as pd

source = Path('output/cleaned.csv')
if not source.exists():
    print('Stage 1 did not create output/cleaned.csv; using the raw records.')
    source = Path('data/equipment_dirty.csv')
records = pd.read_csv(source)
outcomes = pd.read_csv('data/maintenance_outcomes.csv')
print(records.head())
print(outcomes.head())

# Continue with your team's own label-building code.
