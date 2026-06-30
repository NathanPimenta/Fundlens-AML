from fastapi import Header, HTTPException, status, Depends
from typing import Optional, List, Dict
import logging

from backend.database.config_store import get_users
from backend.security.audit import audit_log

logger = logging.getLogger("security.rbac")

# Permissions metadata definition
PERMISSIONS_METADATA = {
    "CASE_VIEW": {
        "code": "CASE_VIEW",
        "label": "View Cases",
        "description": "Allows viewing of cases, timelines, and alert details."
    },
    "CASE_ASSIGN": {
        "code": "CASE_ASSIGN",
        "label": "Assign Cases",
        "description": "Allows changing case triage status and investigator assignees."
    },
    "BLOCKCHAIN_APPROVE": {
        "code": "BLOCKCHAIN_APPROVE",
        "label": "Approve Blockchain Event",
        "description": "Allows authorizing and sealing evidence chain transactions."
    },
    "STR_SUBMIT": {
        "code": "STR_SUBMIT",
        "label": "Submit STR Report",
        "description": "Allows submitting official Suspicious Transaction Reports (STR) to the FIU."
    },
    "WATCHLIST_UPDATE": {
        "code": "WATCHLIST_UPDATE",
        "label": "Manage Watchlist",
        "description": "Allows flagging and updating entities on AML watchlists."
    },
    "CONFIG_MANAGE": {
        "code": "CONFIG_MANAGE",
        "label": "Manage Settings",
        "description": "Allows modifying system configuration and user roster."
    }
}

# Role to Permissions mapping (Single Source of Truth)
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "AML Analyst": ["CASE_VIEW", "CASE_ASSIGN", "WATCHLIST_UPDATE"],
    "Senior Investigator": ["CASE_VIEW", "CASE_ASSIGN", "WATCHLIST_UPDATE"],
    "Supervisor": ["CASE_VIEW", "CASE_ASSIGN", "BLOCKCHAIN_APPROVE", "STR_SUBMIT", "WATCHLIST_UPDATE", "CONFIG_MANAGE"],
    "FIU Liaison": ["CASE_VIEW", "STR_SUBMIT"]
}

def get_current_user(x_user_id: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency to authenticate users via X-User-Id header."""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing X-User-Id header"
        )
    
    users = get_users()
    user = next((u for u in users if u.get("id") == x_user_id), None)
    
    if not user or not user.get("active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unauthorized: User session '{x_user_id}' is invalid or deactivated"
        )
        
    # Resolve role and permissions
    role = user.get("role", "Guest")
    permissions = ROLE_PERMISSIONS.get(role, ["CASE_VIEW"])
    
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "role": role,
        "permissions": permissions
    }

def require_permission(permission_code: str):
    """Factory dependency to enforce RBAC permissions on endpoints."""
    def dependency(user: dict = Depends(get_current_user)):
        if permission_code not in user["permissions"]:
            # Structured audit logging for Denials
            audit_log(
                user_id=user["id"],
                role=user["role"],
                action=permission_code,
                resource_id="API_ENDPOINT",
                outcome="DENIED"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "insufficient_permissions",
                    "required": [permission_code]
                }
            )
        return user
    return dependency
