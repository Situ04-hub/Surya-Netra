import pandas as pd
import numpy as np
import joblib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "models", "FINAL", "xgboost_flare_model.joblib")
CONFIG_PATH = os.path.join(BASE_DIR, "models", "FINAL", "xgboost_alert_config.joblib")
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "goes_ready_full.csv")

class SuryaNetraPredictor:
    def __init__(self, model_path=None, config_path=None):
        if model_path is None:
            model_path = MODEL_PATH
        if config_path is None:
            config_path = CONFIG_PATH

        self.model = joblib.load(model_path)
        self.config = joblib.load(config_path)

        self.threshold = self.config["threshold"]
        self.minimum_consecutive = self.config["minimum_consecutive_predictions"]
        self.cooldown_minutes = self.config["cooldown_minutes"]

        self.prediction_history = []
        self.last_alert_time = None

        print("SURYA-NETRA XGBoost model loaded.")
        print(f"Threshold: {self.threshold}")
        print(f"Minimum consecutive predictions: {self.minimum_consecutive}")
        print(f"Cooldown: {self.cooldown_minutes} minutes")

    def _get_features(self, df_features):
        drop_cols = ["timestamp", "quality_a", "quality_b", "target", "label"]
        return df_features.drop(columns=[c for c in drop_cols if c in df_features.columns])

    def _check_alert(self, probability, timestamp):
        self.prediction_history.append({
            "timestamp": timestamp,
            "probability": probability
        })

        required = self.minimum_consecutive
        recent = self.prediction_history[-required:]

        if len(recent) < required:
            return False

        consecutive = all(
            item["probability"] >= self.threshold
            for item in recent
        )

        if not consecutive:
            return False

        if self.last_alert_time is not None:
            elapsed = (timestamp - self.last_alert_time).total_seconds() / 60

            if elapsed < self.cooldown_minutes:
                return False

        self.last_alert_time = timestamp
        return True

    def _get_severity(self, probability):
        if probability >= 0.85:
            return "RED"
        elif probability >= 0.65:
            return "ORANGE"
        elif probability >= 0.50:
            return "YELLOW"
        else:
            return "GREEN"

    def predict_latest(self, df_features):
        X = self._get_features(df_features)
        probabilities = self.model.predict_proba(X)[:, 1]

        results = []

        timestamps = pd.to_datetime(
            df_features["timestamp"],
            errors="coerce"
        )

        for probability, timestamp in zip(probabilities, timestamps):
            probability = float(probability)

            alert_triggered = self._check_alert(
                probability,
                timestamp
            )

            severity = self._get_severity(probability)

            results.append({
                "timestamp": timestamp,
                "flare_probability": float(np.round(probability, 4)),
                "alert_triggered": bool(alert_triggered),
                "alert_level": severity
            })

        return results

def historical_replay(start_time, end_time):
    start_time = pd.Timestamp(start_time)
    end_time = pd.Timestamp(end_time)

    predictor = SuryaNetraPredictor()

    print("\n" + "=" * 70)
    print("SURYA-NETRA HISTORICAL FLARE REPLAY")
    print("=" * 70)
    print(f"Start: {start_time}")
    print(f"End:   {end_time}")
    print("Reading GOES data in chunks...")
    print()

    chunksize = 500_000

    total_rows = 0
    alert_count = 0

    level_counts = {
        "GREEN": 0,
        "YELLOW": 0,
        "ORANGE": 0,
        "RED": 0
    }

    first_time_for_level = {}
    transition_results = []
    alert_results = []

    max_probability = -1.0
    max_result = None

    previous_level = None
    red_started = False
    red_results = []

    for chunk_number, chunk in enumerate(
        pd.read_csv(DATA_PATH, chunksize=chunksize),
        start=1
    ):
        chunk["timestamp"] = pd.to_datetime(
            chunk["timestamp"],
            errors="coerce"
        )

        chunk_min = chunk["timestamp"].min()
        chunk_max = chunk["timestamp"].max()

        # Skip chunks entirely before the requested window.
        if chunk_max < start_time:
            continue

        # Stop once we have passed the requested window.
        if chunk_min > end_time:
            break

        chunk = chunk[
            (chunk["timestamp"] >= start_time) &
            (chunk["timestamp"] <= end_time)
        ]

        if chunk.empty:
            continue

        print(f"Processing matching data from chunk {chunk_number}...")

        results = predictor.predict_latest(chunk)

        total_rows += len(results)

        for result in results:
            probability = result["flare_probability"]
            level = result["alert_level"]
            timestamp = result["timestamp"]

            level_counts[level] += 1

            if level not in first_time_for_level:
                first_time_for_level[level] = timestamp

            if probability > max_probability:
                max_probability = probability
                max_result = result

            # Show every alert-level transition.
            if level != previous_level:
                transition_results.append(result)
                previous_level = level

            if result["alert_triggered"]:
                alert_count += 1
                alert_results.append(result)

            # Once RED starts, keep the first few RED observations
            # so we can show the final probability progression.
            if level == "RED" and not red_started:
                red_started = True

            if red_started and len(red_results) < 10:
                red_results.append(result)

    print("\n" + "=" * 70)
    print("ALERT LEVEL TRANSITIONS")
    print("=" * 70)

    if transition_results:
        for result in transition_results:
            alert_text = ""

            if result["alert_triggered"]:
                alert_text = " | ALERT TRIGGERED"

            print(
                f"{result['timestamp']} | "
                f"Probability: {result['flare_probability']:.4f} | "
                f"{result['alert_level']}"
                f"{alert_text}"
            )
    else:
        print("No predictions found in requested time range.")

    print("\n" + "=" * 70)
    print("PROBABILITY BUILD-UP AROUND ALERT")
    print("=" * 70)

    if red_results:
        print("First RED observations:")

        for result in red_results:
            print(
                f"{result['timestamp']} | "
                f"Probability: {result['flare_probability']:.4f} | "
                f"{result['alert_level']}"
            )

    elif max_result is not None:
        print("RED was not reached.")
        print("Highest-probability observations:")

        print(
            f"{max_result['timestamp']} | "
            f"Probability: {max_result['flare_probability']:.4f} | "
            f"{max_result['alert_level']}"
        )

    print("\n" + "=" * 70)
    print("REPLAY SUMMARY")
    print("=" * 70)

    print(f"Rows processed: {total_rows}")
    print(f"Alerts triggered: {alert_count}")

    if max_result is not None:
        print(
            f"Maximum probability: "
            f"{max_result['flare_probability']:.4f} "
            f"at {max_result['timestamp']}"
        )

    print("\nAlert-level distribution:")

    for level in ["GREEN", "YELLOW", "ORANGE", "RED"]:
        count = level_counts[level]

        percentage = (
            count / total_rows * 100
            if total_rows > 0
            else 0
        )

        print(
            f"{level:7}: "
            f"{count:6} rows "
            f"({percentage:.2f}%)"
        )

    print("\nFirst occurrence of each alert level:")

    for level in ["GREEN", "YELLOW", "ORANGE", "RED"]:
        if level in first_time_for_level:
            print(
                f"{level}: "
                f"{first_time_for_level[level]}"
            )
        else:
            print(f"{level}: Not reached")

    if alert_results:
        print("\nAlerts:")

        for result in alert_results:
            print(
                f"{result['timestamp']} | "
                f"Probability: {result['flare_probability']:.4f} | "
                f"Level: {result['alert_level']}"
            )

    print("=" * 70)

if __name__ == "__main__":
    print("Testing historical SURYA-NETRA predictor...")

    historical_replay(
        "2024-02-09 13:41:30",
        "2024-02-09 13:46:00"
    )