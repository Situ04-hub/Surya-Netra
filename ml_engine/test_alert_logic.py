import pandas as pd
from predict import SuryaNetraPredictor

def main():
    print("=" * 60)
    print("SURYA-NETRA ALERT STATE LOGIC TEST")
    print("=" * 60)

    predictor = SuryaNetraPredictor()

    start = pd.Timestamp("2024-06-30 20:00:00")

    print("\nTesting 5 consecutive qualifying predictions...")

    results = []

    for i in range(5):
        timestamp = start + pd.Timedelta(minutes=i)
        triggered = predictor._check_alert(0.70, timestamp)
        results.append(triggered)

        print(f"{i + 1}. {timestamp} | Probability: 0.70 | Alert: {triggered}")

    if results[:4] != [False, False, False, False]:
        print("\nFAILED: Alert triggered before 5 consecutive predictions.")
        return

    if results[4] is not True:
        print("\nFAILED: Alert did not trigger on the 5th consecutive prediction.")
        return

    print("\nPASS: 5-consecutive rule works.")

    print("\nTesting 60-minute cooldown...")

    cooldown_result = predictor._check_alert(0.70, start + pd.Timedelta(minutes=30))

    print(f"30 minutes after alert | Alert: {cooldown_result}")

    if cooldown_result:
        print("FAILED: Cooldown did not block the alert.")
        return

    print("PASS: 60-minute cooldown blocks a new alert.")

    print("\nTesting alert at cooldown boundary...")

    boundary_results = []

    for minute in range(61, 65):
        timestamp = start + pd.Timedelta(minutes=minute)
        triggered = predictor._check_alert(0.70, timestamp)
        boundary_results.append(triggered)

        print(f"{timestamp} | Alert: {triggered}")

    if not boundary_results[3]:
        print("FAILED: Alert did not resume at the cooldown boundary.")
        return

    print("PASS: Alert resumes at the 60-minute cooldown boundary.")

    print("\n" + "=" * 60)
    print("ALL ALERT LOGIC TESTS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    main()