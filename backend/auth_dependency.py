from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from firebase_init import verify_token
from database import get_db, User, Client


async def get_firebase_identity(authorization: str = Header(None)):
    """
    Verifies only the Firebase token. Does NOT check PostgreSQL.
    Use this for endpoints that should work even for a user who hasn't
    picked a role/client yet (e.g. registration itself).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    id_token = authorization.split("Bearer ")[1]
    try:
        decoded_token = verify_token(id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return {"uid": decoded_token.get("uid"), "email": decoded_token.get("email")}


async def get_current_user(identity: dict = Depends(get_firebase_identity), db: Session = Depends(get_db)):
    """
    Verifies the Firebase token AND requires the user to be registered
    in PostgreSQL with a role/client. Use this for protected data routes.
    """
    user = db.query(User).filter(User.firebase_uid == identity["uid"]).first()
    if not user:
        raise HTTPException(status_code=403, detail="not_registered")

    client = db.query(Client).filter(Client.client_id == user.client_id).first()

    return {
        "uid": user.firebase_uid,
        "email": user.email,
        "role": user.role,
        "client_id": user.client_id,
        "client_name": client.client_name if client else None,
        "bigquery_dataset": client.bigquery_dataset if client else None,
    }