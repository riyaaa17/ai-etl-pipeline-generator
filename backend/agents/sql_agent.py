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

SQL_SYSTEM_PROMPT = """You are a SQL Generation Agent for a BigQuery-based ETL system.

Given a KPI definition (which may contain ONE or MULTIPLE metrics) and a database schema,
generate a single valid BigQuery SQL query that calculates ALL requested metrics together,
as separate columns in one result set, grouped by the same time period or dimension.

Rules:
- Always fully qualify table names as `{dataset}.{table_name}`
- If there are multiple metrics, compute each as its own column in the SELECT clause
  (e.g. SUM(order_amount) AS revenue, AVG(order_amount) AS avg_order_value), all grouped
  by the same period/dimension so they align in one row per period
- Apply all specified filters
- For any string/status filters, always use LOWER(column) = 'value' or LOWER(column) NOT IN (...)
  for case-insensitive matching
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

Generate the BigQuery SQL query that returns ALL requested metrics as columns in one query.
"""
    response = llm.invoke([
        {"role": "system", "content": SQL_SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ])

    sql = response.content
    if isinstance(sql, list):
        sql = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in sql
        )
    sql = sql.strip()

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

    kpi = understand_kpi("Calculate monthly revenue and average order value for 2025.")
    schema = get_relevant_schema("client_retailmart")
    plan = plan_transformations(kpi, schema)
    sql = generate_sql(kpi, schema, "client_retailmart", plan)

    print("Generated SQL:\n")
    print(sql)