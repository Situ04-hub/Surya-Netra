# ml_engine/clean_data.py

import pandas as pd
import os

ML_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(ML_ENGINE_ROOT, 'data/raw/goes_2024_raw.csv')
OUTPUT_FILE = os.path.join(ML_ENGINE_ROOT, 'data/processed/goes_cleaned_2024.csv')

print("=" * 70)
print("SURYA-NETRA - DATA CLEANER")
print("=" * 70)
print(f"Input: {INPUT_FILE}")

if not os.path.exists(INPUT_FILE):
    print(f"ERROR: File not found: {INPUT_FILE}")
    print("Please run download_goes.py first.")
    exit(1)

df = pd.read_csv(INPUT_FILE)
df['timestamp'] = pd.to_datetime(df['timestamp'])
print(f"Loaded {len(df)} rows")

# Quality filter
df_clean = df[df['quality_b'] == 0].copy()
print(f"Rows after quality filter: {len(df_clean)}")

# Remove invalid
df_clean = df_clean[df_clean['xrsa'] >= 0]
df_clean = df_clean[df_clean['xrsb'] >= 0]
df_clean = df_clean.dropna()
print(f"Rows after cleaning: {len(df_clean)}")

# Sort and save
df_clean = df_clean.sort_values('timestamp').reset_index(drop=True)
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
df_clean.to_csv(OUTPUT_FILE, index=False)

print(f"Saved to: {OUTPUT_FILE}")
print("CLEANING COMPLETE!")