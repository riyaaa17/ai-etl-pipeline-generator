import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "mcp_server"))

from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

from kpi_agent import understand_kpi
from schema_agent import get_relevant_schema
from transformation_agent import plan_transformations
from sql_agent import generate_sql, llm
from validation_agent import validate_sql
from data_quality_agent import check_data_quality
from documentation_agent import generate_documentation
from monitoring_agent import generate_monitoring_report


# ---------- STATE ----------
class PipelineState(TypedDict):
    requirement: str
    bigquery_dataset: str
    kpi_definition: Optional[dict]
    schema: Optional[dict]
    transformation_plan: Optional[dict]
    sql_query: Optional[str]
    validation_result: Optional[dict]
    correction_attempts: int
    final_results: Optional[list]
    documentation: Optional[dict]
    monitoring_report: Optional[dict]
    error: Optional[str]


# ---------- NODES ----------
def kpi_node(state: PipelineState) -> PipelineState:
    print("→ Running KPI Understanding Agent...")
    kpi = understand_kpi(state["requirement"])
    return {**state, "kpi_definition": kpi}


def schema_node(state: PipelineState) -> PipelineState:
    print("→ Running Schema Agent...")
    schema = get_relevant_schema(state["bigquery_dataset"])
    return {**state, "schema": schema}


def transformation_node(state: PipelineState) -> PipelineState:
    print("→ Running Transformation Agent...")
    plan = plan_transformations(state["kpi_definition"], state["schema"])
    return {**state, "transformation_plan": plan}


def sql_node(state: PipelineState) -> PipelineState:
    print("→ Running SQL Generation Agent...")
    sql = generate_sql(
        state["kpi_definition"],
        state["schema"],
        state["bigquery_dataset"],
        state.get("transformation_plan")
    )
    return {**state, "sql_query": sql}


def validation_node(state: PipelineState) -> PipelineState:
    print("→ Running Validation Agent...")
    result = validate_sql(state["bigquery_dataset"], state["sql_query"])
    return {**state, "validation_result": result}


def correction_node(state: PipelineState) -> PipelineState:
    print(f"→ Self-correcting SQL (attempt {state['correction_attempts'] + 1})...")
    error_message = state["validation_result"]["error"]

    correction_prompt = f"""
The following SQL query failed with this error:
{error_message}

Original SQL:
{state['sql_query']}

Available Schema:
{state['schema']}

Fix the SQL query. Respond ONLY with the corrected raw SQL, no markdown, no explanation.
"""
    response = llm.invoke([{"role": "user", "content": correction_prompt}])
    
    corrected_sql = response.content
    if isinstance(corrected_sql, list):
        corrected_sql = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in corrected_sql
        )
    corrected_sql = corrected_sql.strip()
    if corrected_sql.startswith("```"):
        corrected_sql = corrected_sql.split("```")[1]
        if corrected_sql.startswith("sql"):
            corrected_sql = corrected_sql[3:]
        corrected_sql = corrected_sql.strip()

    return {
        **state,
        "sql_query": corrected_sql,
        "correction_attempts": state["correction_attempts"] + 1
    }


def finalize_node(state: PipelineState) -> PipelineState:
    print("→ Finalizing results...")
    return {**state, "final_results": state["validation_result"]["results"]}


def documentation_node(state: PipelineState) -> PipelineState:
    print("→ Running Documentation Agent...")
    row_count = len(state["final_results"]) if state["final_results"] else 0
    doc = generate_documentation(
        state["kpi_definition"],
        state["transformation_plan"],
        state["sql_query"],
        row_count
    )
    return {**state, "documentation": doc}


def monitoring_node(state: PipelineState) -> PipelineState:
    print("→ Running Monitoring Agent...")
    kpi_name = state["kpi_definition"].get("kpi_name", "this metric") if state["kpi_definition"] else "this metric"
    report = generate_monitoring_report(state["final_results"], kpi_name)
    return {**state, "monitoring_report": report}


def fail_node(state: PipelineState) -> PipelineState:
    print("→ Max correction attempts reached. Pipeline failed.")
    return {**state, "error": "Could not generate valid SQL after multiple attempts."}


# ---------- ROUTING LOGIC ----------
def route_after_validation(state: PipelineState) -> str:
    if state["validation_result"]["valid"]:
        return "finalize"
    elif state["correction_attempts"] >= 3:
        return "fail"
    else:
        return "correct"


# ---------- BUILD GRAPH ----------
def build_graph():
    graph = StateGraph(PipelineState)

    graph.add_node("kpi", kpi_node)
    graph.add_node("schema", schema_node)
    graph.add_node("transformation", transformation_node)
    graph.add_node("sql", sql_node)
    graph.add_node("validate", validation_node)
    graph.add_node("correct", correction_node)
    graph.add_node("finalize", finalize_node)
    graph.add_node("documentation", documentation_node)
    graph.add_node("monitoring", monitoring_node)
    graph.add_node("fail", fail_node)

    graph.set_entry_point("kpi")
    graph.add_edge("kpi", "schema")
    graph.add_edge("schema", "transformation")
    graph.add_edge("transformation", "sql")
    graph.add_edge("sql", "validate")

    graph.add_conditional_edges(
        "validate",
        route_after_validation,
        {
            "finalize": "finalize",
            "correct": "correct",
            "fail": "fail"
        }
    )

    graph.add_edge("correct", "validate")  # loop back to re-validate
    graph.add_edge("finalize", "documentation")
    graph.add_edge("documentation", "monitoring")
    graph.add_edge("monitoring", END)
    graph.add_edge("fail", END)

    return graph.compile()


if __name__ == "__main__":
    import json

    app = build_graph()

    initial_state = {
        "requirement": "Calculate monthly revenue for 2025, excluding cancelled and refunded orders.",
        "bigquery_dataset": "client_retailmart",
        "kpi_definition": None,
        "schema": None,
        "transformation_plan": None,
        "sql_query": None,
        "validation_result": None,
        "correction_attempts": 0,
        "final_results": None,
        "documentation": None,
        "monitoring_report": None,
        "error": None
    }

    final_state = app.invoke(initial_state)

    print("\n" + "="*50)
    print("PIPELINE COMPLETE")
    print("="*50)

    if final_state.get("error"):
        print(f"Error: {final_state['error']}")
    else:
        print(f"\nTransformation Plan:\n{json.dumps(final_state['transformation_plan'], indent=2)}")
        print(f"\nFinal SQL:\n{final_state['sql_query']}")
        print(f"\nResults ({len(final_state['final_results'])} rows):")
        print(json.dumps(final_state["final_results"][:5], indent=2, default=str))
        print(f"\nDocumentation:\n{json.dumps(final_state['documentation'], indent=2)}")
        print(f"\nMonitoring Report:\n{json.dumps(final_state['monitoring_report'], indent=2)}")