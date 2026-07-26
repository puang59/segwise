import asyncio
from backend.agents.state import create_initial_state
from backend.agents.kabir import run_kabir
import logging
logging.basicConfig(level=logging.INFO)

async def main():
    state = create_initial_state("test")
    state["intent"] = "segment"
    state["resolved_columns"] = [
        "customer_id", "total_balance", "total_spent", "recency_days",
        "credit_score", "customer_tenure_days", "total_accounts",
        "has_loan", "has_Credit", "has_Debit", "credit_risk_tier"
    ]
    state = await run_kabir(state)
    print("Engineered features:", state.get("engineered_features"))
    print("df_path:", state.get("df_path"))

asyncio.run(main())
