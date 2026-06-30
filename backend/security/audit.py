import logging
from datetime import datetime, timezone
from backend.database.config_store import append_audit_log

logger = logging.getLogger("security.audit")

def audit_log(user_id: str, role: str, action: str, resource_id: str, outcome: str) -> None:
    """Log structured security audit trails."""
    timestamp = datetime.now(timezone.utc).isoformat()
    log_msg = f"User: {user_id} | Role: {role} | Action: {action} | Resource: {resource_id} | Outcome: {outcome}"
    if outcome == "DENIED":
        logger.warning("SECURITY ALERT: %s", log_msg)
    else:
        logger.info("SECURITY AUDIT: %s", log_msg)
        
    try:
        append_audit_log(
            actor_id=user_id,
            action=action,
            section="security",
            details=f"{action} on {resource_id} - {outcome}",
            payload={
                "role": role,
                "resource_id": resource_id,
                "outcome": outcome,
                "timestamp": timestamp
            }
        )
    except Exception as e:
        logger.exception("Failed to write structured audit log to store: %s", e)
