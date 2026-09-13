import sys
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth_dependency import get_current_user, get_firebase_identity
from authorization import check_dataset_access
from database import get_db, User, Client, PipelineHistory

sys.path.append("agents")
from graph import build_graph

pipeline_app = build_graph()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return user


@app.get("/clients")
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).all()
    return [{"client_id": c.client_id, "client_name": c.client_name} for c in clients]


@app.post("/register-user")
def register_user(payload: dict, identity: dict = Depends(get_firebase_identity), db: Session = Depends(get_db)):
    role = payload.get("role")
    client_id = payload.get("client_id")

    if not role or not client_id:
        raise HTTPException(status_code=400, detail="role and client_id are required")

    existing = db.query(User).filter(User.firebase_uid == identity["uid"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")

    new_user = User(
        firebase_uid=identity["uid"],
        email=identity["email"],
        role=role,
        client_id=client_id
    )
    db.add(new_user)
    db.commit()

    return {"message": "User registered successfully"}


@app.get("/query-dataset")
def query_dataset(dataset: str, user: dict = Depends(get_current_user)):
    check_dataset_access(user, dataset)
    return {
        "message": f"Access granted. Querying dataset: {dataset}",
        "user": user["email"],
        "role": user["role"]
    }


@app.get("/tables")
def list_tables(user: dict = Depends(get_current_user)):
    sys.path.append("mcp_server")
    from server import list_allowed_datasets

    tables = list_allowed_datasets(bigquery_dataset=user["bigquery_dataset"])
    return {"dataset": user["bigquery_dataset"], "tables": tables}


@app.get("/tables/{table_name}/preview")
def preview_table(table_name: str, user: dict = Depends(get_current_user)):
    sys.path.append("mcp_server")
    from server import get_sample_rows

    try:
        rows = get_sample_rows(
            bigquery_dataset=user["bigquery_dataset"],
            table_name=table_name,
            limit=10
        )
        return {"table": table_name, "rows": rows}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not load table: {str(e)}")


@app.get("/tables/{table_name}/stats")
def table_stats(table_name: str, user: dict = Depends(get_current_user)):
    sys.path.append("mcp_server")
    from server import get_table_schema, execute_authorized_query

    try:
        schema = get_table_schema(bigquery_dataset=user["bigquery_dataset"], table_name=table_name)

        count_query = f"SELECT COUNT(*) as row_count FROM `{user['bigquery_dataset']}.{table_name}`"
        count_result = execute_authorized_query(bigquery_dataset=user["bigquery_dataset"], sql_query=count_query)
        row_count = count_result[0]["row_count"] if count_result else 0

        return {
            "table": table_name,
            "row_count": row_count,
            "column_count": len(schema),
            "columns": schema
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not load stats: {str(e)}")


@app.post("/run-sql")
def run_custom_sql(payload: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in ("Data Engineer", "Admin"):
        raise HTTPException(
            status_code=403,
            detail="Only Data Engineers and Admins can run custom SQL queries."
        )

    sql_query = payload.get("sql_query")
    if not sql_query:
        raise HTTPException(status_code=400, detail="Missing 'sql_query' field.")

    sys.path.append("mcp_server")
    from server import execute_authorized_query

    try:
        results = execute_authorized_query(
            bigquery_dataset=user["bigquery_dataset"],
            sql_query=sql_query
        )
        return {"results": results, "row_count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/admin/users")
def list_org_users(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view user lists.")

    users = db.query(User).filter(User.client_id == user["client_id"]).all()
    return [
        {
            "user_id": u.user_id,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


@app.patch("/admin/users/{user_id}/role")
def update_user_role(user_id: int, payload: dict, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can modify user roles.")

    new_role = payload.get("role")
    valid_roles = ["Admin", "Data Engineer", "Business Analyst", "Viewer"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {valid_roles}")

    target_user = db.query(User).filter(
        User.user_id == user_id,
        User.client_id == user["client_id"]
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your organization.")

    target_user.role = new_role
    db.commit()

    return {"message": f"Updated {target_user.email}'s role to {new_role}"}


@app.get("/admin/history")
def get_pipeline_history(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view pipeline history.")

    records = (
        db.query(PipelineHistory, User.email)
        .join(User, PipelineHistory.user_id == User.user_id)
        .filter(PipelineHistory.client_id == user["client_id"])
        .order_by(PipelineHistory.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "history_id": h.history_id,
            "user_email": email,
            "requirement": h.requirement,
            "kpi_name": h.kpi_name,
            "sql_query": h.sql_query,
            "row_count": h.row_count,
            "status": h.status,
            "error_message": h.error_message,
            "created_at": h.created_at.isoformat() if h.created_at else None
        }
        for h, email in records
    ]


@app.post("/generate-pipeline")
def generate_pipeline(requirement: dict, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if user["role"] == "Viewer":
        raise HTTPException(
            status_code=403,
            detail="Viewers do not have permission to generate pipelines. Contact your Admin to request Business Analyst or Data Engineer access."
        )

    business_requirement = requirement.get("requirement")
    if not business_requirement:
        raise HTTPException(status_code=400, detail="Missing 'requirement' field.")

    db_user = db.query(User).filter(User.firebase_uid == user["uid"]).first()

    initial_state = {
        "requirement": business_requirement,
        "bigquery_dataset": user["bigquery_dataset"],
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

    try:
        final_state = pipeline_app.invoke(initial_state)
    except Exception as e:
        error_str = str(e)
        if "insufficient_quota" in error_str or "credit_balance_exhausted" in error_str:
            raise HTTPException(
                status_code=503,
                detail="The AI service is temporarily unavailable due to API quota limits. Please contact the administrator or try again later."
            )
        elif "rate_limit" in error_str.lower() or "429" in error_str:
            raise HTTPException(
                status_code=503,
                detail="The AI service is receiving too many requests right now. Please wait a moment and try again."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Pipeline generation failed unexpectedly: {error_str[:200]}"
            )

    if final_state.get("error"):
        history_entry = PipelineHistory(
            user_id=db_user.user_id,
            client_id=user["client_id"],
            requirement=business_requirement,
            kpi_name=None,
            sql_query=final_state.get("sql_query"),
            row_count=0,
            status="failed",
            error_message=final_state["error"]
        )
        db.add(history_entry)
        db.commit()
        raise HTTPException(status_code=422, detail=final_state["error"])

    row_count = len(final_state["final_results"]) if final_state["final_results"] else 0
    kpi_name = final_state["kpi_definition"].get("kpi_name") if final_state.get("kpi_definition") else None

    history_entry = PipelineHistory(
        user_id=db_user.user_id,
        client_id=user["client_id"],
        requirement=business_requirement,
        kpi_name=kpi_name,
        sql_query=final_state["sql_query"],
        row_count=row_count,
        status="success"
    )
    db.add(history_entry)
    db.commit()

    return {
        "kpi_definition": final_state["kpi_definition"],
        "transformation_plan": final_state["transformation_plan"],
        "sql_query": final_state["sql_query"],
        "results": final_state["final_results"],
        "row_count": row_count,
        "documentation": final_state["documentation"],
        "monitoring_report": final_state["monitoring_report"]
    }