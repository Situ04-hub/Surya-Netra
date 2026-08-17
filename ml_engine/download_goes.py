# ml_engine/download_goes.py

from sunpy.net import Fido, attrs as a
from sunpy import timeseries as ts
import pandas as pd
import os
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# CONFIGURATION
# ============================================================

START_DATE = "2024-01-01"
END_DATE = "2024-06-30"

ML_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_RAW_DIR = os.path.join(ML_ENGINE_ROOT, 'data/raw')
DATA_RAW_FILE = os.path.join(DATA_RAW_DIR, 'goes_2024_raw.csv')

print("=" * 70)
print("SURYA-NETRA - GOES DATA DOWNLOADER")
print("=" * 70)
print(f"Date Range: {START_DATE} to {END_DATE}")
print(f"Output: {DATA_RAW_FILE}")
print("=" * 70)

print("\n[1/4] Searching for GOES-16 XRS data...")

result = Fido.search(
    a.Time(START_DATE, END_DATE),
    a.Instrument.xrs,
    a.goes.SatelliteNumber(16)
)

print(f"Found {len(result)} files")

print("\n[2/4] Downloading files...")
print("This may take 10-30 minutes depending on your internet speed.")

try:
    files = Fido.fetch(result)
    print(f"Downloaded {len(files)} files")
except Exception as e:
    print(f"Download failed: {e}")
    exit(1)

print("\n[3/4] Loading and combining data...")

all_dfs = []

for i, file_path in enumerate(files, 1):
    try:
        print(f"  Processing {i}/{len(files)}: {os.path.basename(file_path)}")
        data = ts.TimeSeries(file_path)
        df = data.to_table().to_pandas()
        
        # Find column names
        time_col = None
        for col in df.columns:
            if col in ['time', 'timestamp', 't_rec', 't_obs', 'date']:
                time_col = col
                break
        
        if time_col is None:
            time_col = df.columns[0]
        
        # Find flux columns
        xrsa_col = None
        xrsb_col = None
        for col in df.columns:
            if 'xrsa' in col.lower():
                xrsa_col = col
            if 'xrsb' in col.lower():
                xrsb_col = col
        
        if xrsa_col is None or xrsb_col is None:
            flux_cols = [col for col in df.columns if 'flux' in col.lower()]
            if len(flux_cols) >= 2:
                xrsa_col = flux_cols[0]
                xrsb_col = flux_cols[1]
        
        # Find quality flags
        quality_a_col = None
        quality_b_col = None
        for col in df.columns:
            if 'flag' in col.lower() and 'a' in col.lower():
                quality_a_col = col
            if 'flag' in col.lower() and 'b' in col.lower():
                quality_b_col = col
        
        # Build clean DataFrame
        clean_df = pd.DataFrame()
        clean_df['timestamp'] = df[time_col]
        clean_df['xrsa'] = df[xrsa_col] if xrsa_col else 0.0
        clean_df['xrsb'] = df[xrsb_col] if xrsb_col else 0.0
        clean_df['quality_a'] = df[quality_a_col] if quality_a_col else 0
        clean_df['quality_b'] = df[quality_b_col] if quality_b_col else 0
        
        all_dfs.append(clean_df)
        
    except Exception as e:
        print(f"  Error loading {file_path}: {e}")
        continue

if not all_dfs:
    print("\nERROR: No data was loaded.")
    exit(1)

combined_df = pd.concat(all_dfs, ignore_index=True)
combined_df['timestamp'] = pd.to_datetime(combined_df['timestamp'])
combined_df = combined_df.sort_values('timestamp').reset_index(drop=True)

print(f"Total rows: {len(combined_df)}")

print("\n[4/4] Saving data...")
os.makedirs(DATA_RAW_DIR, exist_ok=True)
combined_df.to_csv(DATA_RAW_FILE, index=False)

print(f"Saved to: {DATA_RAW_FILE}")
print("\n" + "=" * 70)
print("DOWNLOAD COMPLETE!")
print("Next step: Run clean_data.py")
print("=" * 70)