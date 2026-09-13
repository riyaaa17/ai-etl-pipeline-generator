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
2. The actual database schema the user is authorized to access (their organization's tables and columns only)

Your job is to extract a structured KPI definition — BUT ONLY if the requirement genuinely relates to
concepts, entities, or data plausibly present in the given schema.

If the requirement references a business domain, entity, or concept that clearly does NOT belong to
the given schema (for example: asking about "flights" or "bookings" when the schema only has restaurant/
delivery tables, or asking about "patients" when the schema is retail-focused, or naming a specific
company/organization that is not the user's own), you must NOT attempt to force-fit it. Instead, return
an error response.

Respond ONLY with valid JSON in ONE of these two exact formats:

If the requirement is valid for this schema:
{
    "kpi_name": "string",
    "formula": "string (e.g. SUM(order_amount))",
    "time_period": "string (e.g. Monthly, Yearly, Daily)",
    "filters": ["list of filter conditions as strings"],
    "required_concepts": ["list of business concepts needed"]
}

If the requirement does NOT match this schema's domain:
{
    "error": "out_of_scope",
    "reason": "one short sentence explaining what concept/entity was requested that doesn't belong to this dataset"
}

Do not include any explanation, markdown formatting, or text outside the JSON object.
"""

def understand_kpi(requirement: str, schema: dict = None) -> dict:
    """
    Takes a natural-language business requirement and the user's authorized
    schema, and returns a structured KPI definition. If the requirement
    references concepts outside the given schema's domain, returns an
    out_of_scope error instead of hallucinating a KPI.
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
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse KPI response", "raw_response": content}


if __name__ == "__main__":
    test_requirement = "Calculate monthly revenue and customer retention for 2025. Exclude cancelled and refunded orders."
    result = understand_kpi(test_requirement)
    print(json.dumps(result, indent=2))