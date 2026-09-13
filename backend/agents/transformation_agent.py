import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    temperature=0,
    google_api_key=os.getenv("GEMINI_API_KEY")
)

TRANSFORMATION_SYSTEM_PROMPT = """You are a Transformation Agent for a data engineering system.

Given a KPI definition and a database schema, determine the exact data transformation
steps required BEFORE SQL is written. Think like a data engineer planning the pipeline.

Respond ONLY with valid JSON in this exact format:
{
    "filtering_steps": ["list of filter conditions needed, in plain English"],
    "joins_needed": ["list of table joins needed, e.g. 'orders JOIN customers ON customer_id'"],
    "aggregations": ["list of aggregation operations needed"],
    "date_transformations": ["list of date/time grouping operations needed"],
    "calculated_fields": ["list of any derived/calculated fields needed"],
    "data_quality_notes": ["list of potential data quality concerns to handle, e.g. case sensitivity, nulls, duplicates"]
}

Do not include any explanation, markdown formatting, or text outside the JSON object.
"""

def plan_transformations(kpi_definition: dict, schema: dict) -> dict:
    """
    Takes a KPI definition and schema, and returns an explicit transformation
    plan (filters, joins, aggregations) before SQL generation happens.
    """
    prompt = f"""
KPI Definition:
{json.dumps(kpi_definition, indent=2)}

Available Schema:
{json.dumps(schema, indent=2)}

Plan the required transformations.
"""
    response = llm.invoke([
        {"role": "system", "content": TRANSFORMATION_SYSTEM_PROMPT},
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
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse transformation plan", "raw_response": content}


if __name__ == "__main__":
    from kpi_agent import understand_kpi
    from schema_agent import get_relevant_schema

    kpi = understand_kpi("Calculate monthly revenue for 2025, excluding cancelled and refunded orders.")
    schema = get_relevant_schema("client_retailmart")
    plan = plan_transformations(kpi, schema)

    print(json.dumps(plan, indent=2))