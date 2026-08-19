import pandas as pd
import numpy as np
import os
from predict import SuryaNetraPredictor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(BASE_DIR, "data", "processed", "goes_ready_v2.csv")

print("Streaming dataset in chunks to find positive solar flare samples...")
chunksize = 500000
flare_chunks = []
found_count = 0

for chunk in pd.read_csv(data_path, chunksize=chunksize):
    # Downcast to keep RAM clean
    for col in chunk.select_dtypes(include=['float64']).columns:
        chunk[col] = pd.to_numeric(chunk[col], downcast='float')
    for col in chunk.select_dtypes(include=['int64']).columns:
        chunk[col] = pd.to_numeric(chunk[col], downcast='integer')
        
    positives = chunk[chunk['target'] == 1]
    if not positives.empty:
        flare_chunks.append(positives)
        found_count += len(positives)
        
    if found_count >= 10:
        break

flare_samples = pd.concat(flare_chunks, ignore_index=True).head(10)

print(f"\nEvaluating model on {len(flare_samples)} actual solar flare events...")
predictor = SuryaNetraPredictor()
results = predictor.predict_latest(flare_samples)

for i, res in enumerate(results):
    print(f"Flare Sample {i+1}: Probability = {res['flare_probability']:.4f} | Alert Level = {res['alert_level']}")