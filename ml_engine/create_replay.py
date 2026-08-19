# ml_engine/create_replay.py

import pandas as pd
import os

ML_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
INPUT = os.path.join(ML_ENGINE_ROOT, 'data/processed/goes_cleaned_2024.csv')
OUTPUT = os.path.join(ML_ENGINE_ROOT, 'data/replay/plan_b_replay.csv')

if not os.path.exists(INPUT):
    print("ERROR: Cleaned data not found. Run clean_data.py first.")
    exit(1)

df = pd.read_csv(INPUT)
df['timestamp'] = pd.to_datetime(df['timestamp'])
print(f"Loaded {len(df)} rows")

# Gannon Storm: May 8-10, 2024
mask = (df['timestamp'] >= '2024-05-08') & (df['timestamp'] <= '2024-05-10')
replay = df[mask].copy()

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
replay.to_csv(OUTPUT, index=False)

print(f"Saved {len(replay)} rows to {OUTPUT}")
print("PLAN B REPLAY CREATED!")