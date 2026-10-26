# STAGE 2 | Build the Labels -- append below your existing cleaning code.
import json
import pandas as pd
from pathlib import Path
cleaned_path = Path('output/cleaned.csv')
if cleaned_path.exists():
    cleaned = pd.read_csv(cleaned_path)
    print('Loaded the cleaned dataset saved in Stage 1.')
else:
    print('Stage 1 did not create output/cleaned.csv. Loading the raw dataset so Stage 2 remains available. Complete the Stage 1 cleaning steps below before labeling; the missed Stage 1 still scores zero.')
    cleaned = pd.read_csv('data/equipment_dirty.csv')
logs = pd.read_csv('data/maintenance_outcomes.csv')
split = pd.read_csv('data/split_manifest.csv')
print(logs.head())
# TODO: normalize IDs and status text. Map the COMPLETE status strings:
# 'corrective repair confirmed' -> 1
# 'inspection complete — no corrective repair' -> 0
# Do not infer labels from a substring such as 'repair'. Both contain it!
# TODO: join one-to-one; flag unmatched IDs instead of assigning zero.
# TODO: join split, fit mean/std ONLY on training IDs (use ddof=0).
# Write output/labeled.csv: record_id, 12 features, needs_maintenance, split.
# Write output/preprocessing.json with keys:
# features: ordered list of 12 input feature names
# median, mean, std: dictionaries keyed by feature (std must be > 0)
# fitted_ids: list of exactly the 6,000 training record IDs
# Use training medians retained from stage 1.
