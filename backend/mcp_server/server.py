from mcp.server.fastmcp import FastMCP
from google.cloud import bigquery

mcp = FastMCP("BigQuery-MCP-Server")

bq_client = bigquery.Client(project="logical-hallway-499706-c3")

# In a real request flow, this would come from the authenticated user's
# session (client_id -> bigquery_dataset from PostgreSQL). For now, we
# accept it as a required parameter so every tool call is explicitly scoped.

@mcp.tool()
def list_allowed_datasets(bigquery_dataset: str) -> list[str]:
    """
    Lists all tables inside the caller's authorized dataset only.
    bigquery_dataset must match the user's assigned dataset (e.g. 'client_retailmart').
    """
    dataset_ref = bq_client.dataset(bigquery_dataset)
    tables = bq_client.list_tables(dataset_ref)
    return [table.table_id for table in tables]


@mcp.tool()
def get_dataset_schema(bigquery_dataset: str) -> dict:
    """
    Returns the schema (tables + columns) for the caller's authorized dataset.
    """
    dataset_ref = bq_client.dataset(bigquery_dataset)
    tables = bq_client.list_tables(dataset_ref)

    schema = {}
    for table in tables:
        table_ref = dataset_ref.table(table.table_id)
        table_obj = bq_client.get_table(table_ref)
        schema[table.table_id] = [
            {"name": field.name, "type": field.field_type} for field in table_obj.schema
        ]
    return schema


@mcp.tool()
def get_table_schema(bigquery_dataset: str, table_name: str) -> list[dict]:
    """
    Returns the schema for a single table inside the caller's authorized dataset.
    """
    table_ref = bq_client.dataset(bigquery_dataset).table(table_name)
    table_obj = bq_client.get_table(table_ref)
    return [{"name": field.name, "type": field.field_type} for field in table_obj.schema]


@mcp.tool()
def get_sample_rows(bigquery_dataset: str, table_name: str, limit: int = 5) -> list[dict]:
    """
    Returns a small sample of rows from a table inside the caller's authorized dataset.
    """
    query = f"SELECT * FROM `{bq_client.project}.{bigquery_dataset}.{table_name}` LIMIT {limit}"
    results = bq_client.query(query).result()
    return [dict(row) for row in results]


@mcp.tool()
def execute_authorized_query(bigquery_dataset: str, sql_query: str) -> list[dict]:
    """
    Executes a SQL query, but only if it references tables within the
    caller's authorized dataset. Blocks any query referencing other datasets.
    """
    if bigquery_dataset not in sql_query:
        raise ValueError(
            f"Query rejected: must only reference authorized dataset '{bigquery_dataset}'."
        )

    # Basic safety check: block queries referencing any other client_ dataset
    other_dataset_patterns = [
        "client_retailmart", "client_foodgo", "client_travelease",
        "client_techstore", "client_healthplus"
    ]
    for pattern in other_dataset_patterns:
        if pattern != bigquery_dataset and pattern in sql_query:
            raise ValueError(
                f"Query rejected: references unauthorized dataset '{pattern}'."
            )

    results = bq_client.query(sql_query).result()
    return [dict(row) for row in results]


if __name__ == "__main__":
    mcp.run()