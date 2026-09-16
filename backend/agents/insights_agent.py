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

INSIGHTS_SYSTEM_PROMPT = """You are a Business Insights Agent. Given a KPI name and its
result data, produce a concise executive summary.

Respond ONLY with valid JSON in this exact format:
{
    "insight": "string - one sentence overall summary",
    "trend": "string - one of: 'upward', 'downward', 'stable', 'volatile'",
    "key_points": ["3-5 short bullet points, each under 15 words, covering: peak value and when, lowest value and when, overall change, and one actionable observation"]
}

Do not include any explanation, markdown formatting, or text outside the JSON object.
"""


def generate_insight(kpi_name: str, results: list) -> dict:
    if not results or len(results) == 0:
        return {"insight": "No data available.", "trend": "stable", "key_points": []}

    prompt = f"""
KPI: {kpi_name}

Results data:
{json.dumps(results, indent=2, default=str)}

Write the executive summary.
"""
    response = llm.invoke([
        {"role": "system", "content": INSIGHTS_SYSTEM_PROMPT},
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
        result = json.loads(content)
        result.setdefault("key_points", [])
        return result
    except json.JSONDecodeError:
        return {"insight": "Could not generate insight summary.", "trend": "stable", "key_points": []}


if __name__ == "__main__":
    test_results = [
        {"month": "2025-08", "total_revenue": 69733.81},
        {"month": "2025-09", "total_revenue": 747224.61},
    ]
    result = generate_insight("Monthly Revenue", test_results)
    print(json.dumps(result, indent=2))