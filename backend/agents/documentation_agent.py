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


DOC_SYSTEM_PROMPT = """You are a Documentation Agent for a data engineering system.

Given the full pipeline context (KPI definition, transformation plan, SQL query,
and validation results), write a clear, professional documentation summary that
a data engineer or business user could read to understand exactly how this KPI
was calculated.

Respond ONLY with valid JSON in this exact format:
{
    "title": "string - short title for this KPI report",
    "summary": "string - 2-3 sentence plain-English summary of what this KPI measures",
    "data_sources": ["list of tables used"],
    "columns_used": ["list of specific columns referenced"],
    "filters_applied": ["list of filters in plain English"],
    "transformations_applied": ["list of transformation steps in plain English"],
    "sql_query": "string - the final SQL query, unchanged",
    "row_count": "number - how many result rows were returned",
    "generated_at": "string - leave as a placeholder 'TIMESTAMP'",
    "notes": ["list of any caveats, data quality concerns, or assumptions made"]
}

Do not include any explanation, markdown formatting, or text outside the JSON object.
"""

def generate_documentation(
    kpi_definition: dict,
    transformation_plan: dict,
    sql_query: str,
    row_count: int
) -> dict:
    """
    Takes the full pipeline output and generates human-readable documentation
    explaining exactly how the KPI was calculated.
    """
    prompt = f"""
KPI Definition:
{json.dumps(kpi_definition, indent=2)}

Transformation Plan:
{json.dumps(transformation_plan, indent=2)}

Final SQL Query:
{sql_query}

Row Count: {row_count}

Generate the documentation.
"""
    response = llm.invoke([
        {"role": "system", "content": DOC_SYSTEM_PROMPT},
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
        doc = json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse documentation", "raw_response": content}

    from datetime import datetime, timezone
    doc["generated_at"] = datetime.now(timezone.utc).isoformat()

    return doc


if __name__ == "__main__":
    from kpi_agent import understand_kpi
    from schema_agent import get_relevant_schema
    from transformation_agent import plan_transformations
    from sql_agent import generate_sql

    kpi = understand_kpi("Calculate monthly revenue for 2025, excluding cancelled and refunded orders.")
    schema = get_relevant_schema("client_retailmart")
    plan = plan_transformations(kpi, schema)
    sql = generate_sql(kpi, schema, "client_retailmart", plan)

    doc = generate_documentation(kpi, plan, sql, row_count=13)
    print(json.dumps(doc, indent=2))