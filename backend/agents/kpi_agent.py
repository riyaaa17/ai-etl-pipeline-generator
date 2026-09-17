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

KPI_SYSTEM_PROMPT = """You are a KPI Understanding Agent for a secure, multi-client data engineering system.

You will be given:
1. A natural-language business requirement from a user
2. The actual database schema the user is authorized to access

Extract a structured KPI definition. The requirement may ask for ONE metric or MULTIPLE
related metrics together (e.g. "monthly revenue, retention rate, and average order value").

If the requirement references a business domain, entity, or concept that clearly does NOT
belong to the given schema, return an out_of_scope error instead of forcing a fit.

Respond ONLY with valid JSON in ONE of these two exact formats:

If the requirement is valid for this schema:
{
    "kpi_name": "string - short combined title, e.g. 'Monthly Revenue, Retention Rate & AOV'",
    "time_period": "string (e.g. Monthly, Yearly, Daily)",
    "metrics": [
        {
            "metric_name": "string - short name, e.g. 'Revenue'",
            "formula": "string (e.g. SUM(order_amount))"
        }
    ],
    "filters": ["list of filter conditions as strings"],
    "required_concepts": ["list of business concepts needed"]
}

If the requirement does NOT match this schema's domain:
{
    "error": "out_of_scope",
    "reason": "one short sentence explaining what concept/entity was requested that doesn't belong to this dataset"
}

Always populate "metrics" as a list, even for a single metric (a list with one item).
Do not include any explanation, markdown formatting, or text outside the JSON object.
"""


def understand_kpi(requirement: str, schema: dict = None) -> dict:
    """
    Takes a natural-language business requirement and the user's authorized
    schema, and returns a structured KPI definition supporting one or more
    metrics. If the requirement references concepts outside the given
    schema's domain, returns an out_of_scope error instead.
    """
    schema_context = f"\n\nAuthorized Schema (tables and columns you may reference):\n{json.dumps(schema, indent=2)}" if schema else ""

    user_message = f"{requirement}{schema_context}"

    response = llm.invoke([
        {"role": "system", "content": KPI_SYSTEM_PROMPT},
        {"role": "user", "content": user_message}
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
        # Backward-compat: if the model returns old-style single "formula",
        # normalize it into the metrics list format.
        if "metrics" not in parsed and "formula" in parsed:
            parsed["metrics"] = [{"metric_name": parsed.get("kpi_name", "Value"), "formula": parsed["formula"]}]
        return parsed
    except json.JSONDecodeError:
        return {"error": "Failed to parse KPI response", "raw_response": content}


if __name__ == "__main__":
    test_requirement = "Calculate monthly revenue and average order value for 2025."
    result = understand_kpi(test_requirement)
    print(json.dumps(result, indent=2))