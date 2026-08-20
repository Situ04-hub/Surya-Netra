import pandas as pd
import os
from predict import SuryaNetraPredictor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "processed", "goes_ready_full.csv")

print("Streaming dataset in chunks to find positive solar flare samples...")

chunksize = 500000
flare_chunks = []
found_count = 0

for chunk in pd.read_csv(DATA_FILE, chunksize=chunksize):
    positives = chunk[chunk["target"] == 1]

    if not positives.empty:
        flare_chunks.append(positives)
        found_count += len(positives)

    if found_count >= 10:
        break

if not flare_chunks:
    raise RuntimeError("No positive flare samples found.")

flare_samples = pd.concat(flare_chunks, ignore_index=True).head(10)

print(f"\nEvaluating model on {len(flare_samples)} actual solar flare samples...")

predictor = SuryaNetraPredictor()
results = predictor.predict_latest(flare_samples)

for i, result in enumerate(results):
    print(
        f"Flare Sample {i + 1}: "
        f"Probability = {result['flare_probability']:.4f} | "
        f"Alert Level = {result['alert_level']}"
    )
