import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "mcp_server"))

from schema_agent import get_relevant_schema
from kpi_agent import understand_kpi
import json

# Test: TravelEase user asking about HealthPlus concepts
schema = get_relevant_schema("client_travelease")
result = understand_kpi("Show me total billing amounts and patient appointment counts", schema)
print("TravelEase asked about HealthPlus concepts:")
print(json.dumps(result, indent=2))

print("\n" + "="*50 + "\n")

# Test: TechStore user asking about FoodGo concepts
schema2 = get_relevant_schema("client_techstore")
result2 = understand_kpi("What is the average delivery time and cuisine popularity?", schema2)
print("TechStore asked about FoodGo concepts:")
print(json.dumps(result2, indent=2))