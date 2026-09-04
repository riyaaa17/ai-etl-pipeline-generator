import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "mcp_server"))

from server import execute_authorized_query

def validate_sql(bigquery_dataset: str, sql_query: str) -> dict:
    """
    Attempts to execute the generated SQL. If it fails, returns the error
    so the SQL Agent can self-correct. If it succeeds, returns the results.
    """
    try:
        results = execute_authorized_query(bigquery_dataset=bigquery_dataset, sql_query=sql_query)
        return {
            "valid": True,
            "results": results,
            "row_count": len(results)
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import json
    bad_sql = "SELECT * FROM client_retailmart.nonexistent_table LIMIT 5"
    result = validate_sql("client_retailmart", bad_sql)
    print(json.dumps(result, indent=2, default=str))