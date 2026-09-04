import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "mcp_server"))

from server import get_dataset_schema

def get_relevant_schema(bigquery_dataset: str) -> dict:
    """
    Fetches the full schema (all tables + columns) for the user's
    authorized dataset, so downstream agents know what's available.
    """
    schema = get_dataset_schema(bigquery_dataset=bigquery_dataset)
    return schema


if __name__ == "__main__":
    import json
    result = get_relevant_schema("client_retailmart")
    print(json.dumps(result, indent=2))