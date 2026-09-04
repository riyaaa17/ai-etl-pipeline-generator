import os
import json
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0,
    api_key=os.getenv("OPENAI_API_KEY")
)

SQL_SYSTEM_PROMPT = """You are a SQL Generation Agent for a BigQuery-based ETL system.

Given a KPI definition and a database schema, generate a valid BigQuery SQL query
that calculates the requested KPI.

Rules:
- Always fully qualify table names as `{dataset}.{table_name}`
- Apply all specified filters
- For any string/status filters, always use LOWER(column) = 'value' or LOWER(column) NOT IN (...) 
  to ensure case-insensitive matching, since data casing may vary
- Use proper BigQuery date functions (DATE_TRUNC, FORMAT_DATE, etc.) for time-based grouping
- Respond ONLY with the raw SQL query, no markdown, no explanation
"""

def generate_sql(kpi_definition: dict, schema: dict, bigquery_dataset: str, transformation_plan: dict = None) -> str:
    plan_text = f"\n\nTransformation Plan:\n{json.dumps(transformation_plan, indent=2)}" if transformation_plan else ""

    prompt = f"""
KPI Definition:
{json.dumps(kpi_definition, indent=2)}

Available Schema (dataset: {bigquery_dataset}):
{json.dumps(schema, indent=2)}
{plan_text}

Generate the BigQuery SQL query for this KPI.
"""
    response = llm.invoke([
        {"role": "system", "content": SQL_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ])

    sql = response.content.strip()
    if sql.startswith("```"):
        sql = sql.split("```")[1]
        if sql.startswith("sql"):
            sql = sql[3:]
        sql = sql.strip()

    return sql


if __name__ == "__main__":
    from kpi_agent import understand_kpi
    from schema_agent import get_relevant_schema
    from transformation_agent import plan_transformations

    kpi = understand_kpi("Calculate monthly revenue excluding cancelled and refunded orders.")
    schema = get_relevant_schema("client_retailmart")
    plan = plan_transformations(kpi, schema)
    sql = generate_sql(kpi, schema, "client_retailmart", plan)

    print("Generated SQL:\n")
    print(sql)