import pandas as pd
import numpy as np
import joblib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "models", "FINAL", "xgboost_flare_model.joblib")
CONFIG_PATH = os.path.join(BASE_DIR, "models", "FINAL", "xgboost_alert_config.joblib")

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

        consecutive = all(item["probability"] >= self.threshold for item in recent)

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
        """
        Accepts a single row or batch of preprocessed feature data.
        Returns probability, alert status and severity.
        """
        X = self._get_features(df_features)
        probabilities = self.model.predict_proba(X)[:, 1]

        results = []

        if "timestamp" in df_features.columns:
            timestamps = pd.to_datetime(df_features["timestamp"], errors="coerce")
        else:
            timestamps = pd.Series(pd.Timestamp.now(), index=df_features.index)

        for probability, timestamp in zip(probabilities, timestamps):
            probability = float(probability)
            alert_triggered = self._check_alert(probability, timestamp)
            severity = self._get_severity(probability)

            results.append({
                "timestamp": timestamp,
                "flare_probability": float(np.round(probability, 4)),
                "alert_triggered": bool(alert_triggered),
                "alert_level": severity
            })

        return results

if __name__ == "__main__":
    data_path = os.path.join(BASE_DIR, "data", "processed", "goes_ready_v2.csv")

    print("Testing final SURYA-NETRA predictor...")

    sample_df = pd.read_csv(data_path, nrows=20)
    predictor = SuryaNetraPredictor()
    predictions = predictor.predict_latest(sample_df)

    print("\nPredictions:")

    for i, result in enumerate(predictions):
        print(f"Sample {i + 1}: {result}")