from fastapi import Header, HTTPException
from firebase_init import verify_token

async def get_current_user(authorization: str = Header(None)):
    """
    Expects header: Authorization: Bearer <firebase_id_token>
    Verifies the token and returns the decoded user info.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    id_token = authorization.split("Bearer ")[1]

    try:
        decoded_token = verify_token(id_token)
        return decoded_token  # contains uid, email, etc.
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))