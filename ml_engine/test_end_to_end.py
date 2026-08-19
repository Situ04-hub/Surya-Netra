import os
import pandas as pd
from predict import SuryaNetraPredictor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_FILE = os.path.join(BASE_DIR, "data", "processed", "goes_ready_v2.csv")

XGBOOST_FEATURES = [
    "xrsa",
    "xrsb",
    "flux",
    "flux_5min_avg",
    "flux_15min_avg",
    "flux_60min_avg",
    "flux_5min_max",
    "flux_15min_max",
    "flux_60min_max",
    "flux_diff_1min",
    "flux_diff_5min",
    "flux_diff_15min",
    "rate_1min",
    "rate_5min",
    "rate_15min",
    "flux_ratio_5min",
    "flux_ratio_15min",
    "ratio_derivative",
    "flux_12h_max",
    "flux_24h_max",
    "hour_sin",
    "hour_cos"
]

def main():
    print("=" * 70)
    print("SURYA-NETRA END-TO-END PIPELINE TEST")
    print("=" * 70)

    print("\n1. Loading real GOES feature data...")

    df = pd.read_csv(DATA_FILE, usecols=["timestamp"] + XGBOOST_FEATURES, nrows=100)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    print(f"Rows loaded: {len(df)}")
    print(f"XGBoost features: {len(XGBOOST_FEATURES)}")

    print("\n2. Loading final predictor...")

    predictor = SuryaNetraPredictor()

    print("\n3. Running predictions...")

    results = predictor.predict_latest(df)

    print(f"Predictions generated: {len(results)}")

    print("\n4. Checking prediction structure...")

    required_fields = [
        "timestamp",
        "flare_probability",
        "alert_triggered",
        "alert_level"
    ]

    for result in results:
        for field in required_fields:
            if field not in result:
                raise RuntimeError(f"Missing prediction field: {field}")

    print("PASS: All prediction fields present.")

    print("\n5. Checking probability values...")

    probabilities = [result["flare_probability"] for result in results]

    if not all(0.0 <= p <= 1.0 for p in probabilities):
        raise RuntimeError("Probability outside 0-1 range.")

    print("PASS: All probabilities are between 0 and 1.")

    print("\n6. Checking alert levels...")

    valid_levels = {"GREEN", "YELLOW", "ORANGE", "RED"}
    levels = [result["alert_level"] for result in results]

    if not all(level in valid_levels for level in levels):
        raise RuntimeError("Invalid alert level found.")

    print("PASS: All alert levels are valid.")

    print("\n7. Sample final predictions...")

    for i, result in enumerate(results[:10]):
        print(f"{i + 1}. {result}")

    print("\n" + "=" * 70)
    print("END-TO-END PIPELINE TEST PASSED")
    print("=" * 70)

    print("\nPipeline verified:")
    print("GOES data")
    print("  ↓")
    print("22 XGBoost features")
    print("  ↓")
    print("Final XGBoost model")
    print("  ↓")
    print("Flare probability")
    print("  ↓")
    print("0.65 threshold + alert logic")
    print("  ↓")
    print("GREEN / YELLOW / ORANGE / RED")

if __name__ == "__main__":
    main()