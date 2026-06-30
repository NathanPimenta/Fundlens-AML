from fastapi import APIRouter, Depends, HTTPException, Header, status
from typing import Optional
from pydantic import BaseModel

from backend.security.rbac import get_current_user, ROLE_PERMISSIONS, PERMISSIONS_METADATA
from backend.database.config_store import get_users

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    user_id: str
    password: Optional[str] = None

@router.get("/me")
async def auth_me(user: dict = Depends(get_current_user)):
    """Retrieve logged-in user profile, role, and permissions (with metadata)."""
    resolved_permissions = []
    for perm_code in user["permissions"]:
        meta = PERMISSIONS_METADATA.get(perm_code)
        if meta:
            resolved_permissions.append(meta)
            
    return {
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "permissions": user["permissions"],
        "permissions_meta": resolved_permissions,
        "all_permissions_meta": list(PERMISSIONS_METADATA.values())
    }

@router.post("/login")
async def auth_login(body: LoginRequest):
    """Simulate login for predefined user roster."""
    uid = body.user_id.strip()
    users = get_users()
    user = next((u for u in users if u.get("id") == uid), None)
    
    if not user or not user.get("active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID or deactivated user profile."
        )
        
    role = user.get("role", "Guest")
    permissions = ROLE_PERMISSIONS.get(role, ["CASE_VIEW"])
    
    resolved_permissions = []
    for perm_code in permissions:
        meta = PERMISSIONS_METADATA.get(perm_code)
        if meta:
            resolved_permissions.append(meta)
            
    return {
        "success": True,
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "role": role,
            "permissions": permissions,
            "permissions_meta": resolved_permissions
        }
    }
