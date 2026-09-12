import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "mcp_server"))

import json
from schema_agent import get_relevant_schema
from validation_agent import validate_sql
from sql_agent import llm

# Fetch real schema for context
schema = get_relevant_schema("client_retailmart")

# Deliberately broken SQL - references a column that doesn't exist
broken_sql = "SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(nonexistent_column) AS total FROM `client_retailmart.orders` GROUP BY month"

print("Step 1: Validating deliberately broken SQL...")
print(f"SQL: {broken_sql}\n")

result = validate_sql("client_retailmart", broken_sql)
print(f"Validation result: {json.dumps(result, indent=2, default=str)}\n")

if not result["valid"]:
    print("="*60)
    print("Validation correctly caught the error. Triggering self-correction...")
    print("="*60 + "\n")

    correction_prompt = f"""
The following SQL query failed with this error:
{result['error']}

Original SQL:
{broken_sql}

Available Schema:
{json.dumps(schema, indent=2)}

Fix the SQL query. Respond ONLY with the corrected raw SQL, no markdown, no explanation.
"""
    response = llm.invoke([{"role": "user", "content": correction_prompt}])
    corrected_sql = response.content.strip()
    if corrected_sql.startswith("```"):
        corrected_sql = corrected_sql.split("```")[1]
        if corrected_sql.startswith("sql"):
            corrected_sql = corrected_sql[3:]
        corrected_sql = corrected_sql.strip()

    print(f"Corrected SQL:\n{corrected_sql}\n")

    print("Step 2: Re-validating corrected SQL...")
    retry_result = validate_sql("client_retailmart", corrected_sql)

    if retry_result["valid"]:
        print("\n✅ SELF-CORRECTION SUCCEEDED")
        print(f"Results ({len(retry_result['results'])} rows):")
        print(json.dumps(retry_result["results"][:3], indent=2, default=str))
    else:
        print(f"\n❌ Correction attempt still failed: {retry_result['error']}")
else:
    print("Unexpected: the 'broken' SQL actually validated successfully.")