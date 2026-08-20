# SURYA-NETRA — ML Engine

## Folder Structure:
````text
ml_engine/
├── data/
│   ├── raw/
│   │   └── goes_2024_raw.csv          # Raw GOES data (Git LFS)
│   ├── processed/                     # Generated processed data (local only)
│   └── replay/                        # Replay/test data (local only)
│
├── models/
│   ├── FINAL/
│   │   ├── xgboost_flare_model.joblib  # Final trained XGBoost model
│   │   └── xgboost_alert_config.joblib # Alert threshold/configuration
│   └── ARCHIEVE/                       # Archived models (local only)
│
├── experiments/                        # ML experiments (local only)
│
├── clean_data.py                       # Clean raw GOES data
├── engineer_features.py                # Generate ML features
├── train_xgboost.py                    # Train/retrain XGBoost model
├── predict.py                          # Generate predictions and alerts
├── feature_importance.py               # Analyze feature importance
├── test_flares.py                      # Test flare detection
├── test_end_to_end.py                  # Test complete ML pipeline
└── README.md                            # ML engine documentation
````

## Steps to Run:

### 1. Get raw GOES data

```text
ml_engine/data/raw/goes_2024_raw.csv
```

### 2. Clean

```powershell
python ml_engine/clean_data.py
```

Creates:

```text
ml_engine/data/processed/goes_cleaned_2024.csv
```

### 3. Engineer features

```powershell
python ml_engine/engineer_features.py
```

Creates:

```text
ml_engine/data/processed/goes_ready_full.csv
```

### 4. Test

```powershell
python ml_engine/test_end_to_end.py
python ml_engine/test_flares.py
```

### 5. Predict

```powershell
python ml_engine/predict.py
```

Uses the existing model:

```text
models/FINAL/xgboost_flare_model.joblib
models/FINAL/xgboost_alert_config.joblib
```

## Important:

**Do NOT run `train_xgboost.py` for normal prediction.**

`train_xgboost.py` is only for ML model training/retraining.

```text
Normal:
Raw → Clean → Engineer → Test → Predict

Training:
Raw → Clean → Engineer → Train XGBoost → Evaluate → Final Model
```

Generated files:

```text
data/processed/*.csv
data/replay/*.csv
```

are local/generated files and should not be committed.

## Final Model:

```text
Model: XGBoost
Threshold: 0.65
Minimum consecutive predictions: 5
Cooldown: 60 minutes
```

### Alert Levels

```text
< 0.50       GREEN
0.50–<0.65   YELLOW
0.65–<0.85   ORANGE
≥ 0.85       RED
```

An alert requires **5 consecutive predictions ≥ 0.65**.

## Performance:

| Metric    | Result |
| --------- | -----: |
| Accuracy  | 89.74% |
| Precision | 34.12% |
| Recall    | 68.95% |
| F1        | 0.4565 |
| ROC-AUC   | 0.9196 |
| PR-AUC    | 0.4884 |

### Event-Level

```text
M/X events:      158
Detected:        153/158
Event Recall:    96.84%
False Alert Rate: 80.58%
Median Warning:  31.1 minutes
```

### Verdict

**Good event detection and warning time, but high false-alert rate.**

```