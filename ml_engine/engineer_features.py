import pandas as pd
import numpy as np
import os

ML_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(ML_ENGINE_ROOT, "data", "processed", "goes_cleaned_2024.csv")
OUTPUT_DIR = os.path.join(ML_ENGINE_ROOT, "data", "processed")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "goes_ready_full.csv")
CHUNKSIZE = 500000
BUFFER_HOURS = 24

FEATURE_COLUMNS = [
    "xrsa", "xrsb", "flux",
    "flux_5min_avg", "flux_15min_avg", "flux_60min_avg",
    "flux_5min_max", "flux_15min_max", "flux_60min_max",
    "flux_diff_1min", "flux_diff_5min", "flux_diff_15min",
    "rate_1min", "rate_5min", "rate_15min",
    "flux_ratio_5min", "flux_ratio_15min", "ratio_derivative",
    "flux_12h_max", "flux_24h_max", "hour_sin", "hour_cos"
]

if not os.path.exists(INPUT_FILE):
    print(f"ERROR: {INPUT_FILE} not found. Run clean_data.py first.")
    exit(1)


def engineer_chunk(df):
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)

    df["flux"] = df["xrsb"]

    df["flux_5min_avg"] = df["xrsb"].rolling(5).mean()
    df["flux_15min_avg"] = df["xrsb"].rolling(15).mean()
    df["flux_60min_avg"] = df["xrsb"].rolling(60).mean()

    df["flux_5min_max"] = df["xrsb"].rolling(5).max()
    df["flux_15min_max"] = df["xrsb"].rolling(15).max()
    df["flux_60min_max"] = df["xrsb"].rolling(60).max()

    df["flux_diff_1min"] = df["xrsb"].diff(1)
    df["flux_diff_5min"] = df["xrsb"].diff(5)
    df["flux_diff_15min"] = df["xrsb"].diff(15)

    df["rate_1min"] = df["xrsb"].diff(1)
    df["rate_5min"] = df["xrsb"].diff(5) / 5
    df["rate_15min"] = df["xrsb"].diff(15) / 15

    df["flux_ratio_5min"] = df["flux_5min_avg"] / (df["flux_60min_avg"] + 1e-12)
    df["flux_ratio_15min"] = df["flux_15min_avg"] / (df["flux_60min_avg"] + 1e-12)
    df["ratio_derivative"] = df["flux_ratio_5min"].diff(1)

    indexed = df.set_index("timestamp")
    indexed["flux_12h_max"] = indexed["xrsb"].rolling(window="12h", min_periods=1).max()
    indexed["flux_24h_max"] = indexed["xrsb"].rolling(window="24h", min_periods=1).max()

    hours = indexed.index.hour
    indexed["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
    indexed["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)

    df = indexed.reset_index()
    df["target"] = (df["xrsb"] >= 1e-4).astype("int8")

    return df.dropna().reset_index(drop=True)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if os.path.exists(OUTPUT_FILE):
        os.remove(OUTPUT_FILE)

    buffer = pd.DataFrame()
    total_rows = 0
    first_output = True

    print(f"Streaming feature engineering from: {INPUT_FILE}")
    print(f"Output: {OUTPUT_FILE}")

    for chunk_number, chunk in enumerate(pd.read_csv(INPUT_FILE, chunksize=CHUNKSIZE), 1):
        print(f"Processing chunk {chunk_number}...")

        chunk["timestamp"] = pd.to_datetime(chunk["timestamp"], errors="coerce")
        chunk = chunk.dropna(subset=["timestamp"]).sort_values("timestamp")

        if not buffer.empty:
            work = pd.concat([buffer, chunk], ignore_index=True)
        else:
            work = chunk.copy()

        work = work.sort_values("timestamp").reset_index(drop=True)
        engineered = engineer_chunk(work)

        if not buffer.empty:
            first_timestamp = chunk["timestamp"].min()
            engineered = engineered[engineered["timestamp"] >= first_timestamp]

        if engineered.empty:
            buffer = work
            continue

        engineered.to_csv(
            OUTPUT_FILE,
            mode="w" if first_output else "a",
            header=first_output,
            index=False
        )
        first_output = False
        total_rows += len(engineered)

        latest_time = work["timestamp"].max()
        buffer = work[work["timestamp"] >= latest_time - pd.Timedelta(hours=BUFFER_HOURS)].copy()

        print(f"  Input rows: {len(chunk):,} | Output rows: {len(engineered):,}")

    print(f"\nTotal engineered rows: {total_rows:,}")
    print(f"Saved: {OUTPUT_FILE}")
    print(f"Total model features: {len(FEATURE_COLUMNS)}")
    print("FEATURE ENGINEERING COMPLETE!")


if __name__ == "__main__":
    main()
