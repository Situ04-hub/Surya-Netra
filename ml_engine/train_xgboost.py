import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import os
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import average_precision_score, classification_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_data_streaming(file_path, chunksize=500000):
    """Streams data in chunks with downcasting to prevent MemoryError."""
    print(f"Streaming data from {file_path} in chunks of {chunksize:,}...")
    chunks = []
    
    for chunk in pd.read_csv(file_path, chunksize=chunksize):
        # Downcast floats and ints to conserve RAM
        for col in chunk.select_dtypes(include=['float64']).columns:
            chunk[col] = pd.to_numeric(chunk[col], downcast='float')
        for col in chunk.select_dtypes(include=['int64']).columns:
            chunk[col] = pd.to_numeric(chunk[col], downcast='integer')
            
        chunks.append(chunk)
        
    df = pd.concat(chunks, ignore_index=True)
    print(f"Successfully loaded {len(df):,} total rows.")
    return df

def main():
    data_path = os.path.join(BASE_DIR, "data", "processed", "goes_ready_v2.csv")
    
    # 1. Stream & downcast
    df = load_data_streaming(data_path)
    
    # Sort chronologically if needed
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df = df.sort_values('timestamp').reset_index(drop=True)

    # 2. Define target and drop metadata columns
    target_col = 'target'
    columns_to_drop = ['timestamp', 'quality_a', 'quality_b', target_col]
    
    # Keep only valid columns that exist in df
    actual_drops = [c for c in columns_to_drop if c in df.columns]
    
    X = df.drop(columns=actual_drops)
    y = df[target_col].astype(int)

    # Clean up raw dataframe reference to free memory
    del df

    # 3. Handle Class Imbalance
    neg_cases = (y == 0).sum()
    pos_cases = (y == 1).sum()
    imbalance_ratio = neg_cases / pos_cases if pos_cases > 0 else 1.0
    print(f"Dataset split: {pos_cases:,} positive flares / {neg_cases:,} background rows.")
    print(f"Calculated scale_pos_weight: {imbalance_ratio:.2f}")

    # 4. Initialize XGBoost optimized for PR-AUC
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        scale_pos_weight=imbalance_ratio,
        learning_rate=0.05,
        max_depth=5,
        n_estimators=200,
        eval_metric='aucpr',
        random_state=42,
        n_jobs=-1
    )

    # 5. Walk-Forward Cross Validation
    tscv = TimeSeriesSplit(n_splits=5)
    pr_auc_scores = []
    
    print("\nStarting 5-Fold Walk-Forward Cross Validation...")
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        
        model.fit(X_train, y_train)
        y_probs = model.predict_proba(X_test)[:, 1]
        
        fold_pr_auc = average_precision_score(y_test, y_probs)
        pr_auc_scores.append(fold_pr_auc)
        print(f"Fold {fold + 1} PR-AUC: {fold_pr_auc:.4f}")

    print(f"\nMean Walk-Forward PR-AUC: {np.mean(pr_auc_scores):.4f}")

    # 6. Train final model on entire dataset
    print("\nTraining final production XGBoost model...")
    model.fit(X, y)
    
    model_dir = os.path.join(BASE_DIR, "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "xgboost_flare_model.joblib")
    
    joblib.dump(model, model_path)
    print(f"Model saved successfully to: {model_path}")

    # 7. Final Hold-Out Evaluation (Last 20% Chronological)
    split_idx = int(len(X) * 0.8)
    X_test_final, y_test_final = X.iloc[split_idx:], y.iloc[split_idx:]
    y_pred = model.predict(X_test_final)
    
    print("\n--- Final Model Performance Report (Hold-out Test Set) ---")
    print(classification_report(y_test_final, y_pred, zero_division=0))

if __name__ == "__main__":
    main()