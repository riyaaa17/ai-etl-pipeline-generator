from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from firebase_init import verify_token
from database import get_db, User, Client

async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Verifies the Firebase token, then looks up the user's role/client
    info from PostgreSQL. Returns a combined identity + permissions object.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    id_token = authorization.split("Bearer ")[1]

    try:
        decoded_token = verify_token(id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    firebase_uid = decoded_token.get("uid")

    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not registered in the system. Contact an admin.")

    client = db.query(Client).filter(Client.client_id == user.client_id).first()

    return {
        "uid": user.firebase_uid,
        "email": user.email,
        "role": user.role,
        "client_id": user.client_id,
        "client_name": client.client_name if client else None,
        "bigquery_dataset": client.bigquery_dataset if client else None,
    }