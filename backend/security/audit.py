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


def audit_prevention_block(
    *,
    sender_account: str,
    receiver_account: str,
    transaction_id: str,
    risk_score: float,
) -> None:
    """Record an automated prevention block triggered by the transaction gatekeeper."""
    audit_log(
        user_id="system",
        role="Transaction Gatekeeper",
        action="prevention_block",
        resource_id=sender_account,
        outcome="DECLINED",
    )
    try:
        append_audit_log(
            actor_id="system",
            action="prevention_block",
            section="transactions",
            details=f"High-risk transaction blocked for {sender_account}",
            payload={
                "sender_account": sender_account,
                "receiver_account": receiver_account,
                "transaction_id": transaction_id,
                "risk_score": risk_score,
            },
        )
    except Exception as e:
        logger.exception("Failed to persist prevention block audit log: %s", e)


def audit_prevention_override(
    *,
    user_id: str,
    role: str,
    account_id: str,
    reason: str,
) -> None:
    """Record a manual unblock override together with the investigator's reason."""
    audit_log(
        user_id=user_id,
        role=role,
        action="prevention_override",
        resource_id=account_id,
        outcome="OVERRIDDEN",
    )
    try:
        append_audit_log(
            actor_id=user_id,
            action="prevention_override",
            section="transactions",
            details=f"Temporary block released for {account_id}",
            payload={
                "account_id": account_id,
                "reason": reason,
                "outcome": "released",
            },
        )
    except Exception as e:
        logger.exception("Failed to persist prevention override audit log: %s", e)
