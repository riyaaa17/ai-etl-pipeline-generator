import os
import json
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)

ANOMALY_THRESHOLD_PCT = 20


def _find_value_keys(row: dict) -> list:
    """Finds ALL numeric metric columns in a result row (may be more than one)."""
    return [key for key, val in row.items() if isinstance(val, (int, float))]


def _find_label_key(row: dict, value_keys: list) -> str:
    for key in row.keys():
        if key not in value_keys:
            return key
    return None


def detect_anomalies(results: list) -> dict:
    """
    Compares consecutive time-ordered rows in the results and flags any
    period-over-period percentage change beyond ANOMALY_THRESHOLD_PCT,
    checking EVERY numeric metric column independently.
    """
    if not results or len(results) < 2:
        return {"anomalies": [], "note": "Not enough data points to compare trends."}

    value_keys = _find_value_keys(results[0])
    label_key = _find_label_key(results[0], value_keys)

    if not value_keys:
        return {"anomalies": [], "note": "No numeric metric column found to monitor."}

    anomalies = []
    for value_key in value_keys:
        for i in range(1, len(results)):
            prev_val = results[i - 1].get(value_key)
            curr_val = results[i].get(value_key)

            if prev_val is None or curr_val is None or prev_val == 0:
                continue

            pct_change = ((curr_val - prev_val) / abs(prev_val)) * 100

            if abs(pct_change) >= ANOMALY_THRESHOLD_PCT:
                anomalies.append({
                    "metric": value_key,
                    "period": str(results[i].get(label_key)),
                    "previous_period": str(results[i - 1].get(label_key)),
                    "previous_value": prev_val,
                    "current_value": curr_val,
                    "percent_change": round(pct_change, 1),
                    "direction": "increase" if pct_change > 0 else "decrease"
                })

    return {
        "metric_columns": value_keys,
        "anomalies": anomalies,
        "anomaly_count": len(anomalies)
    }


MONITORING_SYSTEM_PROMPT = """You are a Monitoring Agent for a KPI dashboard system.

Given a list of detected anomalies (significant period-over-period changes in one or more
metrics), write short, clear, plain-English alert messages for each one, naming which
metric each alert refers to.

Respond ONLY with valid JSON in this exact format:
{
    "alerts": ["list of short alert strings, one per anomaly, naming the metric"]
}

If there are no anomalies, return {"alerts": []}.
Do not include any explanation, markdown formatting, or text outside the JSON object.
"""


def generate_monitoring_report(results: list, kpi_name: str = "this metric") -> dict:
    """
    Runs anomaly detection across all numeric metric columns, then asks
    the LLM to phrase the findings as clear, human-readable alerts.
    """
    detection = detect_anomalies(results)

    if not detection.get("anomalies"):
        return {
            "anomaly_count": 0,
            "alerts": [],
            "status": "normal"
        }

    prompt = f"""
KPI: {kpi_name}

Detected anomalies:
{json.dumps(detection['anomalies'], indent=2, default=str)}

Write the alert messages.
"""
    response = llm.invoke([
        {"role": "system", "content": MONITORING_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ])

    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
    content = content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {
            "alerts": [
                f"{a['metric']}: {a['direction'].capitalize()} of {abs(a['percent_change'])}% detected in {a['period']}."
                for a in detection["anomalies"]
            ]
        }

    return {
        "anomaly_count": detection["anomaly_count"],
        "alerts": parsed.get("alerts", []),
        "raw_anomalies": detection["anomalies"],
        "status": "anomaly_detected"
    }


if __name__ == "__main__":
    test_results = [
        {"month": "2025-08", "revenue": 69733.81, "avg_order_value": 1200.5},
        {"month": "2025-09", "revenue": 747224.61, "avg_order_value": 1250.0},
    ]

    report = generate_monitoring_report(test_results, kpi_name="Monthly Revenue & AOV")
    print(json.dumps(report, indent=2))