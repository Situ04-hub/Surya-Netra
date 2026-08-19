# SURYA-NETRA — ML Engine

AI/ML module for **M/X-class solar-flare prediction** using an **XGBoost classifier** trained on GOES-16 X-ray data.

## Folder Structure

```text
ml_engine/
│
├── data/
│   ├── .gitkeep
│   └── replay/
│       └── plan_b_replay.csv          <- replay/test data
│
├── models/
│   ├── .gitkeep
│   └── FINAL/
│       ├── xgboost_flare_model.joblib <- trained XGBoost model
│       └── xgboost_alert_config.joblib<- alert configuration
│
├── clean_data.py                      <- clean GOES data
├── create_replay.py                   <- create replay data
├── download_goes.py                   <- download GOES-16 data
├── engineer_features.py               <- generate ML features
├── train_xgboost.py                   <- train XGBoost model
├── predict.py                         <- generate predictions/alerts
├── test_predictor_alert_logic.py      <- test model compatibility
├── test_alert_logic.py                <- test alert rules
└── test_end_to_end.py                 <- test complete ML pipeline
```

## Final AI Model

```text
Model: XGBoost
Threshold: 0.65
Consecutive predictions: 5
Cooldown: 60 minutes
```

## Final Performance

| Metric    |     Result |                  Good Reference |
| --------- | ---------: | ------------------------------: |
| Accuracy  | **89.74%** |                            90%+ |
| Precision | **34.12%** |                            70%+ |
| Recall    | **68.95%** |                            80%+ |
| F1        | **0.4565** |                           0.70+ |
| ROC-AUC   | **0.9196** |                           0.90+ |
| PR-AUC    | **0.4884** |               Dataset-dependent |
| R²        |    **N/A** | Classification → not applicable |

### Event-Level

```text
M/X events:       158
Detected:         153/158
Event Recall:     96.84%
Missed:           5

Alert episodes:   242
False alerts:     195
False Alert Rate: 80.58%

Median warning:   31.1 minutes
Mean warning:     29.6 minutes
```

## Confusion Matrix

```text
                    Predicted
                  No Flare    Flare

Actual No Flare    1,930,509   188,081
Actual Flare          43,858    97,411
```

```text
TN = 1,930,509
FP =   188,081
FN =    43,858
TP =    97,411
```

## Quick Verdict

**Overall: 75/100**

```text
Strong:
✓ Event detection — 96.84%
✓ ROC-AUC — 0.9196
✓ Warning time — 31.1 min median

Weak:
✗ Precision — 34.12%
✗ F1 — 0.4565
✗ False-alert rate — 80.58%
```

**Bottom line:** Good at catching M/X events, but generates too many false alerts.

## Tests

```powershell
python ml_engine/test_predictor_alert_logic.py
python ml_engine/test_alert_logic.py
python ml_engine/test_end_to_end.py
```

All three should pass before using the final model.
