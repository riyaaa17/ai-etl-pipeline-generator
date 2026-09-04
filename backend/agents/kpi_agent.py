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

KPI_SYSTEM_PROMPT = """You are a KPI Understanding Agent for a data engineering system.
Given a natural-language business requirement, extract a structured KPI definition.

Respond ONLY with valid JSON in this exact format:
{
    "kpi_name": "string",
    "formula": "string (e.g. SUM(order_amount))",
    "time_period": "string (e.g. Monthly, Yearly, Daily)",
    "filters": ["list of filter conditions as strings"],
    "required_concepts": ["list of business concepts needed, e.g. revenue, customer, order status"]
}

Do not include any explanation, markdown formatting, or text outside the JSON object.
"""

def understand_kpi(requirement: str) -> dict:
    """
    Takes a natural-language business requirement and returns a structured
    KPI definition (name, formula, time period, filters).
    """
    response = llm.invoke([
        {"role": "system", "content": KPI_SYSTEM_PROMPT},
        {"role": "user", "content": requirement}
    ])

    content = response.content.strip()
    # Strip markdown code fences if the model adds them despite instructions
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse KPI response", "raw_response": content}


if __name__ == "__main__":
    test_requirement = "Calculate monthly revenue and customer retention for 2025. Exclude cancelled and refunded orders."
    result = understand_kpi(test_requirement)
    print(json.dumps(result, indent=2))