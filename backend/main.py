from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth_dependency import get_current_user
from authorization import check_dataset_access

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
    