# ml_engine/download_goes_fixed.py

"""
download_goes_fixed.py - Download GOES-16 XRS data with automatic column detection
This script handles different column naming conventions in GOES data.
"""

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
print("SURYA-NETRA - GOES DATA DOWNLOADER (FIXED)")
print("=" * 70)
print(f"Date Range: {START_DATE} to {END_DATE}")
print(f"Output: {DATA_RAW_FILE}")
print("=" * 70)

# ============================================================
# SEARCH FOR DATA
# ============================================================

print("\n[1/5] Searching for GOES-16 XRS data...")

result = Fido.search(
    a.Time(START_DATE, END_DATE),
    a.Instrument.xrs,
    a.goes.SatelliteNumber(16)
)

print(f"Found {len(result)} files")

# ============================================================
# DOWNLOAD DATA
# ============================================================

print("\n[2/5] Downloading files...")
print("This may take 10-30 minutes depending on your internet speed.")

try:
    files = Fido.fetch(result)
    print(f"Downloaded {len(files)} files")
except Exception as e:
    print(f"Download failed: {e}")
    exit(1)

# ============================================================
# LOAD AND COMBINE DATA
# ============================================================

print("\n[3/5] Loading and combining data...")

all_dfs = []

for i, file_path in enumerate(files, 1):
    try:
        print(f"  Processing {i}/{len(files)}: {os.path.basename(file_path)}")
        
        # Load the time series
        data = ts.TimeSeries(file_path)
        
        # Convert to DataFrame
        df = data.to_table().to_pandas()
        
        # ============================================================
        # AUTO-DETECT COLUMN NAMES
        # ============================================================
        
        # Find the timestamp column (could be 'time' or 't_rec')
        timestamp_col = None
        for col in df.columns:
            if col in ['time', 'timestamp', 't_rec', 't_obs']:
                timestamp_col = col
                break
        
        if timestamp_col is None:
            print(f"    Warning: Could not find timestamp column. Using first column.")
            timestamp_col = df.columns[0]
        
        # Find the flux columns (could be 'xrsa', 'xrsb', or with '_flux' suffix)
        xrsa_col = None
        xrsb_col = None
        
        for col in df.columns:
            if 'xrsa' in col.lower():
                xrsa_col = col
            if 'xrsb' in col.lower():
                xrsb_col = col
        
        # If specific columns not found, look for flux values
        if xrsa_col is None and xrsb_col is None:
            # Try to find columns with 'flux' in name
            flux_cols = [col for col in df.columns if 'flux' in col.lower()]
            if len(flux_cols) >= 2:
                xrsa_col = flux_cols[0]
                xrsb_col = flux_cols[1]
        
        # Find quality flag columns
        quality_a_col = None
        quality_b_col = None
        
        for col in df.columns:
            if 'flag' in col.lower() and 'a' in col.lower():
                quality_a_col = col
            if 'flag' in col.lower() and 'b' in col.lower():
                quality_b_col = col
        
        # ============================================================
        # CREATE CLEAN DATAFRAME
        # ============================================================
        
        # Start with timestamp
        clean_df = pd.DataFrame()
        clean_df['timestamp'] = df[timestamp_col]
        
        # Add flux columns
        if xrsa_col is not None:
            clean_df['xrsa'] = df[xrsa_col]
        else:
            clean_df['xrsa'] = 0.0  # Placeholder
        
        if xrsb_col is not None:
            clean_df['xrsb'] = df[xrsb_col]
        else:
            clean_df['xrsb'] = 0.0  # Placeholder
        
        # Add quality flags
        if quality_a_col is not None:
            clean_df['quality_a'] = df[quality_a_col]
        else:
            clean_df['quality_a'] = 0  # Assume good quality if not found
        
        if quality_b_col is not None:
            clean_df['quality_b'] = df[quality_b_col]
        else:
            clean_df['quality_b'] = 0  # Assume good quality if not found
        
        # Print what we found
        print(f"    Found: timestamp='{timestamp_col}', xrsa='{xrsa_col}', xrsb='{xrsb_col}'")
        
        all_dfs.append(clean_df)
        
    except Exception as e:
        print(f"  Error loading {file_path}: {e}")
        continue

if not all_dfs:
    print("\nERROR: No data was loaded.")
    print("Please check the column names in your data.")
    exit(1)

# ============================================================
# COMBINE ALL DATA
# ============================================================

print("\n[4/5] Combining all data...")

combined_df = pd.concat(all_dfs, ignore_index=True)
combined_df['timestamp'] = pd.to_datetime(combined_df['timestamp'])
combined_df = combined_df.sort_values('timestamp').reset_index(drop=True)

print(f"Total rows: {len(combined_df)}")
print(f"Date range: {combined_df['timestamp'].min()} to {combined_df['timestamp'].max()}")

# ============================================================
# SAVE DATA
# ============================================================

print("\n[5/5] Saving data...")

os.makedirs(DATA_RAW_DIR, exist_ok=True)
combined_df.to_csv(DATA_RAW_FILE, index=False)

print(f"Saved to: {DATA_RAW_FILE}")

# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("DOWNLOAD COMPLETE!")
print("=" * 70)
print(f"Total rows: {len(combined_df)}")
print(f"Columns: {list(combined_df.columns)}")
print("\nNext step: Run clean_data.py")
print("=" * 70)