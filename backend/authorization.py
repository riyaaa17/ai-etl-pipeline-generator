from fastapi import HTTPException

def check_dataset_access(user: dict, requested_dataset: str):
    """
    Ensures the logged-in user is only allowed to access their own
    assigned BigQuery dataset. Raises 403 if they request another client's data.
    """
    allowed_dataset = user.get("bigquery_dataset")

    if requested_dataset != allowed_dataset:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. You are not authorized to access '{requested_dataset}'."
        )

    return True