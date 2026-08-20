import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import os
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import average_precision_score, classification_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "goes_ready_full.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models", "FINAL")
MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_flare_model.joblib")

DROP_COLUMNS = ["timestamp", "quality_a", "quality_b", "target", "label"]


def load_data_streaming(file_path, chunksize=500000):
    print(f"Streaming data from {file_path} in chunks of {chunksize:,}...\nThis may take around 10–30 minutes depending on your laptop's processor.")
    chunks = []

    for chunk in pd.read_csv(file_path, chunksize=chunksize):
        for col in chunk.select_dtypes(include=["float64"]).columns:
            chunk[col] = pd.to_numeric(chunk[col], downcast="float")
        for col in chunk.select_dtypes(include=["int64"]).columns:
            chunk[col] = pd.to_numeric(chunk[col], downcast="integer")
        chunks.append(chunk)

    df = pd.concat(chunks, ignore_index=True)
    print(f"Successfully loaded {len(df):,} total rows.")
    return df


def build_model(scale_pos_weight):
    return xgb.XGBClassifier(
        objective="binary:logistic",
        scale_pos_weight=scale_pos_weight,
        learning_rate=0.05,
        max_depth=5,
        n_estimators=200,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1
    )


def main():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"{DATA_PATH} not found. Run engineer_features.py first.")

    df = load_data_streaming(DATA_PATH)

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)

    target_col = "target"
    X = df.drop(columns=[c for c in DROP_COLUMNS if c in df.columns])
    y = df[target_col].astype("int8")

    neg_cases = (y == 0).sum()
    pos_cases = (y == 1).sum()
    if pos_cases == 0:
        raise RuntimeError("No positive flare samples found.")

    imbalance_ratio = neg_cases / pos_cases
    print(f"Dataset: {len(df):,} rows")
    print(f"Positive flares: {pos_cases:,}")
    print(f"Background rows: {neg_cases:,}")
    print(f"scale_pos_weight: {imbalance_ratio:.2f}")

    print("\nStarting 5-Fold Walk-Forward Cross Validation...")
    tscv = TimeSeriesSplit(n_splits=5)
    pr_auc_scores = []

    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), 1):
        fold_model = build_model(imbalance_ratio)
        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        fold_model.fit(X_train, y_train)
        y_probs = fold_model.predict_proba(X_test)[:, 1]

        score = average_precision_score(y_test, y_probs)
        pr_auc_scores.append(score)
        print(f"Fold {fold} PR-AUC: {score:.4f}")

    print(f"\nMean Walk-Forward PR-AUC: {np.mean(pr_auc_scores):.4f}")

    split_idx = int(len(X) * 0.8)
    X_train_final = X.iloc[:split_idx]
    y_train_final = y.iloc[:split_idx]
    X_test_final = X.iloc[split_idx:]
    y_test_final = y.iloc[split_idx:]

    print("\nTraining evaluation model on first 80%...")
    evaluation_model = build_model(imbalance_ratio)
    evaluation_model.fit(X_train_final, y_train_final)

    y_probs_final = evaluation_model.predict_proba(X_test_final)[:, 1]
    y_pred_final = (y_probs_final >= 0.5).astype(int)

    print("\n--- Unseen Last-20% Hold-Out Evaluation ---")
    print(classification_report(y_test_final, y_pred_final, zero_division=0))
    print(f"Hold-out PR-AUC: {average_precision_score(y_test_final, y_probs_final):.4f}")

    print("\nTraining final production model on all historical data...")
    production_model = build_model(imbalance_ratio)
    production_model.fit(X, y)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(production_model, MODEL_PATH)
    print(f"Production model saved: {MODEL_PATH}")
    print("TRAINING COMPLETE!")


if __name__ == "__main__":
    main()
