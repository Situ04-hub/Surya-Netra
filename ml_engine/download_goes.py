from sunpy.net import Fido, attrs as a
from sunpy import timeseries as ts
import pandas as pd
import os
import warnings

warnings.filterwarnings("ignore")

# ============================================================
# CONFIGURATION
# ============================================================

START_DATE = "2024-01-01"
END_DATE = "2024-06-30"

ML_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_RAW_DIR = os.path.join(ML_ENGINE_ROOT, "data", "raw")
DATA_RAW_FILE = os.path.join(DATA_RAW_DIR, "goes_2024_raw.csv")

print("=" * 70)
print("SURYA-NETRA - GOES DATA DOWNLOADER")
print("=" * 70)
print(f"Date Range: {START_DATE} to {END_DATE}")
print(f"Output: {DATA_RAW_FILE}")
print("=" * 70)

# ============================================================
# 1. SEARCH
# ============================================================

print("\n[1/4] Searching for GOES-16 1-second XRS data...")

result = Fido.search(
    a.Time(START_DATE, END_DATE),
    a.Instrument.xrs,
    a.goes.SatelliteNumber(16),
    a.Resolution("flx1s")
)

if len(result) == 0 or len(result[0]) == 0:
    raise RuntimeError("No GOES-16 1-second XRS files found.")

rows = result[0]

print(f"1-second files found: {len(rows)}")

# ============================================================
# 2. DOWNLOAD IN BATCHES
# ============================================================

print("\n[2/4] Downloading files in batches...")

all_files = []
BATCH_SIZE = 15

for start in range(0, len(rows), BATCH_SIZE):
    batch = rows[start:start + BATCH_SIZE]
    batch_number = start // BATCH_SIZE + 1
    total_batches = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"\nBatch {batch_number}/{total_batches} ({len(batch)} files)")

    try:
        files = Fido.fetch(batch)
        print(f"Downloaded/available: {len(files)} files")
        all_files.extend(files)
    except Exception as e:
        print(f"Batch failed: {e}")
        print("Continuing with the next batch...")

print(f"\nTotal downloaded/available files: {len(all_files)}")

if len(all_files) == 0:
    raise RuntimeError("No GOES files were downloaded.")

# ============================================================
# 3. LOAD AND COMBINE
# ============================================================

print("\n[3/4] Loading and combining data...")

all_dfs = []

for i, file_path in enumerate(all_files, 1):
    try:
        print(f"Processing {i}/{len(all_files)}: {os.path.basename(file_path)}")

        data = ts.TimeSeries(file_path)
        df = data.to_dataframe()

        required_columns = ["xrsa", "xrsb", "xrsa_quality", "xrsb_quality"]
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            print(f"  Skipping - missing columns:{missing_columns}")
            continue

        clean_df = pd.DataFrame()
        clean_df["timestamp"] = df.index
        clean_df["xrsa"] = df["xrsa"].values
        clean_df["xrsb"] = df["xrsb"].values
        clean_df["quality_a"] = df["xrsa_quality"].values
        clean_df["quality_b"] = df["xrsb_quality"].values

        all_dfs.append(clean_df)

    except Exception as e:
        print(f"  Error loading {file_path}: {e}")
        continue

if not all_dfs:
    raise RuntimeError("No valid GOES XRS data was loaded.")

combined_df = pd.concat(all_dfs, ignore_index=True)

combined_df["timestamp"] = pd.to_datetime(combined_df["timestamp"])

combined_df = (
    combined_df
    .sort_values("timestamp")
    .drop_duplicates("timestamp")
    .reset_index(drop=True)
)

print(f"\nTotal rows: {len(combined_df)}")

print("\nXRSB statistics:")
print(combined_df["xrsb"].describe())

# ============================================================
# 4. SAVE
# ============================================================

print("\n[4/4] Saving data...")

os.makedirs(DATA_RAW_DIR, exist_ok=True)

combined_df.to_csv(DATA_RAW_FILE, index=False)

print(f"\nSaved to: {DATA_RAW_FILE}")

print("\n" + "=" * 70)
print("DOWNLOAD COMPLETE!")
print("Next step: Run clean_data.py")
print("=" * 70)