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


ANOMALY_THRESHOLD_PCT = 20  # flag any period-over-period change beyond this %


def _find_value_key(row: dict) -> str:
    """
    Finds the numeric metric column in a result row (skips the date/label column).
    """
    for key, val in row.items():
        if isinstance(val, (int, float)):
            return key
    return None


def _find_label_key(row: dict, value_key: str) -> str:
    for key in row.keys():
        if key != value_key:
            return key
    return None


def detect_anomalies(results: list) -> dict:
    """
    Compares consecutive time-ordered rows in the results and flags any
    period-over-period percentage change beyond ANOMALY_THRESHOLD_PCT.
    """
    if not results or len(results) < 2:
        return {"anomalies": [], "note": "Not enough data points to compare trends."}

    value_key = _find_value_key(results[0])
    label_key = _find_label_key(results[0], value_key)

    if not value_key:
        return {"anomalies": [], "note": "No numeric metric column found to monitor."}

    anomalies = []
    for i in range(1, len(results)):
        prev_val = results[i - 1][value_key]
        curr_val = results[i][value_key]

        if prev_val is None or curr_val is None or prev_val == 0:
            continue

        pct_change = ((curr_val - prev_val) / abs(prev_val)) * 100

        if abs(pct_change) >= ANOMALY_THRESHOLD_PCT:
            anomalies.append({
                "period": str(results[i].get(label_key)),
                "previous_period": str(results[i - 1].get(label_key)),
                "previous_value": prev_val,
                "current_value": curr_val,
                "percent_change": round(pct_change, 1),
                "direction": "increase" if pct_change > 0 else "decrease"
            })

    return {
        "metric_column": value_key,
        "anomalies": anomalies,
        "anomaly_count": len(anomalies)
    }


MONITORING_SYSTEM_PROMPT = """You are a Monitoring Agent for a KPI dashboard system.

Given a list of detected anomalies (significant period-over-period changes in a metric),
write short, clear, plain-English alert messages for each one.

Respond ONLY with valid JSON in this exact format:
{
    "alerts": ["list of short alert strings, one per anomaly"]
}

If there are no anomalies, return {"alerts": []}.
Do not include any explanation, markdown formatting, or text outside the JSON object.
"""


def generate_monitoring_report(results: list, kpi_name: str = "this metric") -> dict:
    """
    Runs anomaly detection, then asks the LLM to phrase the findings as
    clear, human-readable alerts.
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
                f"{a['direction'].capitalize()} of {abs(a['percent_change'])}% detected in {a['period']}."
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
        {"month": "2025-08", "total_revenue": 69733.81},
        {"month": "2025-09", "total_revenue": 747224.61},
        {"month": "2025-10", "total_revenue": 680179.40},
        {"month": "2025-11", "total_revenue": 785552.94},
        {"month": "2025-12", "total_revenue": 1151761.23},
    ]

    report = generate_monitoring_report(test_results, kpi_name="Monthly Revenue")
    print(json.dumps(report, indent=2))