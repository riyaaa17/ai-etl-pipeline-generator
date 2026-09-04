import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "mcp_server"))

from server import execute_authorized_query
import json

sql = """
SELECT
  DATE_TRUNC(order_date, MONTH) AS month,
  SUM(order_amount) AS monthly_revenue
FROM
  client_retailmart.orders
WHERE
  status != 'Cancelled' AND
  status != 'Refunded'
GROUP BY
  month
ORDER BY
  month
"""

result = execute_authorized_query(bigquery_dataset="client_retailmart", sql_query=sql)
print(json.dumps(result, indent=2, default=str))