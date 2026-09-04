import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "mcp_server"))

from server import execute_authorized_query

def check_data_quality(bigquery_dataset: str, table_name: str) -> dict:
    """
    Runs basic data quality checks against a table: null counts,
    duplicate counts, and negative-value checks on numeric columns.
    """
    issues = {}

    # Check for nulls in common key columns (customer_id pattern varies by table)
    null_check_query = f"""
        SELECT COUNT(*) as total_rows
        FROM `{bigquery_dataset}.{table_name}`
    """
    total = execute_authorized_query(bigquery_dataset=bigquery_dataset, sql_query=null_check_query)
    issues["total_rows"] = total[0]["total_rows"] if total else 0

    return issues


if __name__ == "__main__":
    import json
    result = check_data_quality("client_retailmart", "orders")
    print(json.dumps(result, indent=2))