import joblib
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "FINAL", "xgboost_flare_model.joblib")

print("Loading saved XGBoost model...")
model = joblib.load(MODEL_PATH)

feature_names = model.feature_names_in_
importances = model.feature_importances_

df_importance = pd.DataFrame({
    "Feature": feature_names,
    "Importance": importances
}).sort_values("Importance", ascending=False)

print("\n--- Top 10 Most Important Telemetry Features ---")
print(df_importance.head(10).to_string(index=False))
