from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth_dependency import get_current_user
from authorization import check_dataset_access
import sys
from auth_dependency import get_current_user, get_firebase_identity
from database import get_db, User, Client
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException
sys.path.append("agents")
from graph import build_graph
pipeline_app = build_graph()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default dev port
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
    """
    Simulates a request to query a specific client's BigQuery dataset.
    Enforces that the user can only access their assigned dataset.
    """
    check_dataset_access(user, dataset)

    return {
        "message": f"Access granted. Querying dataset: {dataset}",
        "user": user["email"],
        "role": user["role"]
    }
@app.post("/generate-pipeline")
def generate_pipeline(requirement: dict, user: dict = Depends(get_current_user)):
    """
    Runs the full multi-agent ETL pipeline for the logged-in user's
    requirement. The dataset is always the user's own assigned dataset —
    never taken from the request body, enforcing data isolation.
    """
    business_requirement = requirement.get("requirement")
    if not business_requirement:
        raise HTTPException(status_code=400, detail="Missing 'requirement' field.")

    initial_state = {
        "requirement": business_requirement,
        "bigquery_dataset": user["bigquery_dataset"],  # enforced from user's identity, not input
        "kpi_definition": None,
        "schema": None,
        "transformation_plan": None,
        "sql_query": None,
        "validation_result": None,
        "correction_attempts": 0,
        "final_results": None,
        "documentation": None,
        "error": None
    }

    final_state = pipeline_app.invoke(initial_state)

    if final_state.get("error"):
        raise HTTPException(status_code=422, detail=final_state["error"])

    return {
        "kpi_definition": final_state["kpi_definition"],
        "transformation_plan": final_state["transformation_plan"],
        "sql_query": final_state["sql_query"],
        "results": final_state["final_results"],
        "documentation": final_state["documentation"],
        "row_count": len(final_state["final_results"]) if final_state["final_results"] else 0
    }
    