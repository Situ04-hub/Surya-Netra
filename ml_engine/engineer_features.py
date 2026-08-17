# ml_engine/engineer_features.py

import pandas as pd
import os

ML_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(ML_ENGINE_ROOT, 'data/processed/goes_cleaned_2024.csv')
OUTPUT_DIR = os.path.join(ML_ENGINE_ROOT, 'data/processed')

if not os.path.exists(INPUT_FILE):
    print(f"ERROR: {INPUT_FILE} not found. Run clean_data.py first.")
    exit(1)

df = pd.read_csv(INPUT_FILE)
df['timestamp'] = pd.to_datetime(df['timestamp'])
print(f"Loaded {len(df)} rows")

# Create features
df['flux_5min_avg'] = df['xrsb'].rolling(5).mean()
df['flux_15min_avg'] = df['xrsb'].rolling(15).mean()
df['flux_60min_avg'] = df['xrsb'].rolling(60).mean()
df['flux_diff_1min'] = df['xrsb'].diff(1)
df['flux_diff_5min'] = df['xrsb'].diff(5)
df['flux_diff_15min'] = df['xrsb'].diff(15)
df['flux_ratio_5min'] = df['flux_5min_avg'] / (df['flux_60min_avg'] + 1e-12)
df['flux_ratio_15min'] = df['flux_15min_avg'] / (df['flux_60min_avg'] + 1e-12)
df['ratio_derivative'] = df['flux_ratio_5min'].diff(1)

# Create labels
def classify(flux):
    if flux >= 1e-3:
        return 3  # X-class
    elif flux >= 1e-4:
        return 2  # M-class
    elif flux >= 1e-5:
        return 1  # C-class
    else:
        return 0  # No flare

df['label'] = df['xrsb'].apply(classify)

df = df.dropna()

# Split chronologically (80/20)
split = int(len(df) * 0.8)
train = df.iloc[:split].copy()
test = df.iloc[split:].copy()

os.makedirs(OUTPUT_DIR, exist_ok=True)
train.to_csv(os.path.join(OUTPUT_DIR, 'goes_train.csv'), index=False)
test.to_csv(os.path.join(OUTPUT_DIR, 'goes_test.csv'), index=False)
df.to_csv(os.path.join(OUTPUT_DIR, 'goes_ready_full.csv'), index=False)

print(f"Train: {len(train)}, Test: {len(test)}")
print("FEATURE ENGINEERING COMPLETE!")