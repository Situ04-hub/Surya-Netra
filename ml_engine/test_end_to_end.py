import os
import pandas as pd
from predict import SuryaNetraPredictor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "processed", "goes_ready_full.csv")


def main():
    print("=" * 70)
    print("SURYA-NETRA END-TO-END PIPELINE TEST")
    print("=" * 70)

    print("\n1. Loading real GOES feature data...")
    df = pd.read_csv(DATA_FILE, nrows=100)

    predictor = SuryaNetraPredictor()

    expected_features = list(predictor.model.feature_names_in_)
    missing = [c for c in expected_features if c not in df.columns]

    if missing:
        raise RuntimeError(f"Missing model features: {missing}")

    print(f"Rows loaded: {len(df)}")
    print(f"Model features found: {len(expected_features)}")

    print("\n2. Running predictions...")
    results = predictor.predict_latest(df)

    if len(results) != len(df):
        raise RuntimeError("Prediction count does not match input rows.")

    print(f"Predictions generated: {len(results)}")

    required_fields = ["timestamp", "flare_probability", "alert_triggered", "alert_level"]

    for result in results:
        for field in required_fields:
            if field not in result:
                raise RuntimeError(f"Missing prediction field: {field}")

    print("PASS: Prediction structure is valid.")

    probabilities = [result["flare_probability"] for result in results]

    if not all(0.0 <= p <= 1.0 for p in probabilities):
        raise RuntimeError("Probability outside 0-1 range.")

    print("PASS: All probabilities are between 0 and 1.")

    valid_levels = {"GREEN", "YELLOW", "ORANGE", "RED"}

    if not all(result["alert_level"] in valid_levels for result in results):
        raise RuntimeError("Invalid alert level found.")

    print("PASS: All alert levels are valid.")

    print("\nSample predictions:")
    for i, result in enumerate(results[:10]):
        print(f"{i + 1}. {result}")

    print("\n" + "=" * 70)
    print("END-TO-END PIPELINE TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    main()
