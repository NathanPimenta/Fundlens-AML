import logging
import random
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from backend.security.rbac import get_current_user
from backend.security.audit import audit_prevention_block, audit_prevention_override

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

# Mock in-memory store for temporarily blocked accounts and trust scores
BLOCKED_ACCOUNTS = set()
BENEFICIARY_TRUST_SCORES = {
    "ACC-0089": 12,  # Laundering hub
    "ACC-8455": 25,  # Intermediary shell
    "ACC-0112": 45,  # Suspected mule
}

class TransactionRequest(BaseModel):
    sender: str
    receiver: str
    amount: float
    channel: str = "transfer"
    device_id: Optional[str] = "unknown"

class TransactionResponse(BaseModel):
    status: str  # APPROVED | DECLINED | PENDING_VERIFICATION
    risk_score: float
    message: str
    transaction_id: str

@router.post("/authorize", response_model=TransactionResponse)
async def authorize_transaction(req: TransactionRequest):
    """
    Real-time preventive pre-settlement authorization check (Smart Authorization Gatekeeper).
    Evaluates transaction risk pre-settlement using GNN and behavioral risk indicators.
    """
    import uuid
    tx_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    
    # 1. Check if sender is blocked
    if req.sender in BLOCKED_ACCOUNTS:
        return TransactionResponse(
            status="DECLINED",
            risk_score=99.0,
            message="Transaction declined: Sender account is temporarily frozen.",
            transaction_id=tx_id
        )

    # 2. Destination Trust Scoring (evaluate the beneficiary)
    trust_score = BENEFICIARY_TRUST_SCORES.get(req.receiver, 85)
    
    # Calculate GNN & behavioral risk
    risk_score = 15.0  # baseline
    
    # Increase risk if receiver trust is low
    if trust_score < 30:
        risk_score += 55.0
    elif trust_score < 50:
        risk_score += 30.0
        
    # Increase risk based on amount threshold (anomaly checking)
    if req.amount > 500000:
        risk_score += 25.0
        
    # Destination shell check
    if req.receiver == "ACC-0089":
        risk_score = 94.0  # Force trigger critical GNN block

    # 3. Handle step-up authentication simulation for medium-high risk
    if 70.0 <= risk_score < 90.0:
        return TransactionResponse(
            status="PENDING_VERIFICATION",
            risk_score=risk_score,
            message="Step-up authentication required: Please verify biometric consent.",
            transaction_id=tx_id
        )
        
    # 4. Handle hard pre-settlement decline
    if risk_score >= 90.0:
        # Preventatively lock the sender account
        BLOCKED_ACCOUNTS.add(req.sender)
        
        # Build mock alert payload
        alert = {
            "case_id": f"CASE-{random.randint(3000, 9999)}",
            "typology": "Real-time Prevention Block",
            "risk_score": risk_score,
            "total_amount": req.amount,
            "accounts_count": 2,
            "hops": 1,
            "duration": "0m",
            "channel": req.channel,
            "created_at": "Just now",
            "status": "temporarily_blocked",
            "confidence": "94%",
            "risk_level": "critical",
            "investigator_id": "",
            "sender_account": req.sender,
            "receiver_account": req.receiver
        }
        
        # Persist case in database
        from backend.database.demo_data import insert_prevention_case
        insert_prevention_case(alert["case_id"], req.sender, req.receiver, req.amount, req.channel, risk_score)

        audit_prevention_block(
            sender_account=req.sender,
            receiver_account=req.receiver,
            transaction_id=tx_id,
            risk_score=risk_score,
        )

        # Broadcast via WebSocket manager so it appears in the live alerts feed on dashboard
        from backend.api.main import broadcast_alert
        broadcast_alert(alert)
        
        return TransactionResponse(
            status="DECLINED",
            risk_score=risk_score,
            message=f"Transaction BLOCKED pre-settlement. GNN Simulation detects downstream laundering risk. Account {req.sender} has been placed under temporary restriction.",
            transaction_id=tx_id
        )

    # 5. Authorize normally
    return TransactionResponse(
        status="APPROVED",
        risk_score=risk_score,
        message="Transaction authorized and settled successfully.",
        transaction_id=tx_id
    )

@router.post("/unblock/{account_id}")
async def unblock_account(account_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Override and release the temporary prevention lock on an account."""
    if account_id in BLOCKED_ACCOUNTS:
        BLOCKED_ACCOUNTS.remove(account_id)
        reason = (body or {}).get("reason", "")
        audit_prevention_override(
            user_id=user["id"],
            role=user.get("role", "Investigator"),
            account_id=account_id,
            reason=reason,
        )
        logger.info("Account %s unblocked by investigator %s. Reason: %s", account_id, user["id"], reason)
        return {"status": "success", "message": f"Account {account_id} has been released successfully."}
    return {"status": "success", "message": f"Account {account_id} was not restricted."}
