"""
Client-side financial tools exposed to ElevenLabs agents.

These helpers operate on the cached Nessie dataset that ships with the repo so
that agents can answer questions without making additional API calls. The
functions intentionally use synchronous signatures because the ElevenLabs
client-tools registry expects standard callables.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

DEFAULT_USER_DATA_PATH = Path(
    os.getenv(
        "USER_DATA_PATH",
        "/Users/quamos/hacktx_2025/nessie/user.json",
    )
)


class FinancialTools:
    """Expose strongly typed helpers for ElevenLabs client tools."""

    def __init__(self, user_data_path: Path | str = DEFAULT_USER_DATA_PATH) -> None:
        self.user_data_path = Path(user_data_path)
        self._data_cache: Dict[str, Any] | None = None

    def _load_data(self) -> Dict[str, Any]:
        """Load customer dataset from disk (cached)."""
        if self._data_cache is None:
            with self.user_data_path.open("r", encoding="utf-8") as handle:
                self._data_cache = json.load(handle)
        return self._data_cache

    def _refresh_data(self) -> Dict[str, Any]:
        """Force reload of the JSON payload (used if file changes)."""
        self._data_cache = None
        return self._load_data()

    # ---------------------------------------------------------------------
    # Transaction helpers
    # ---------------------------------------------------------------------
    def get_transactions_90d(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build a webhook-ready list of transactions for the last 90 days.

        The payload mirrors the JSON schema provided in Agents.md so the
        ElevenLabs webhook can forward the data without transformations.
        """
        try:
            data = self._load_data()

            today = datetime.now()
            cutoff = today - timedelta(days=90)
            transactions: List[Dict[str, Any]] = []

            for account in data.get("accounts", []):
                account_id = account.get("_id")

                for purchase in account.get("purchases", []):
                    purchase_date_raw = purchase.get("purchase_date")
                    if not purchase_date_raw:
                        continue

                    try:
                        purchase_date = datetime.strptime(purchase_date_raw, "%Y-%m-%d")
                    except ValueError:
                        continue

                    if purchase_date < cutoff:
                        continue

                    description = purchase.get("description", "")
                    transactions.append({
                        "_id": purchase.get("_id"),
                        "id": purchase.get("_id"),
                        "purchase_date": f"{purchase_date_raw}T00:00:00Z",
                        "transaction_date": f"{purchase_date_raw}T00:00:00Z",
                        "description": description,
                        "merchant_name": description.split()[0] if description else None,
                        "amount": purchase.get("amount", 0),
                        "currency": "USD",
                        "category": self._categorize_transaction(description),
                        "tags": [],
                        "pending": purchase.get("status") == "pending",
                        "status": purchase.get("status", "executed"),
                        "metadata": {
                            "account_id": account_id,
                            "type": purchase.get("type"),
                            "medium": purchase.get("medium"),
                        },
                    })

                for deposit in account.get("deposits", []):
                    deposit_date_raw = deposit.get("transaction_date")
                    if not deposit_date_raw:
                        continue

                    try:
                        deposit_date = datetime.strptime(deposit_date_raw, "%Y-%m-%d")
                    except ValueError:
                        continue

                    if deposit_date < cutoff:
                        continue

                    transactions.append({
                        "_id": deposit.get("_id"),
                        "id": deposit.get("_id"),
                        "purchase_date": f"{deposit_date_raw}T00:00:00Z",
                        "transaction_date": f"{deposit_date_raw}T00:00:00Z",
                        "description": deposit.get("description", ""),
                        "merchant_name": "Deposit",
                        "amount": -1 * deposit.get("amount", 0),
                        "currency": "USD",
                        "category": "income",
                        "tags": ["deposit"],
                        "pending": deposit.get("status") == "pending",
                        "status": deposit.get("status", "executed"),
                        "metadata": {
                            "account_id": account_id,
                            "type": deposit.get("type"),
                            "medium": deposit.get("medium"),
                        },
                    })

            transactions.sort(
                key=lambda item: item.get("transaction_date", ""),
                reverse=True,
            )

            return {
                "success": True,
                "transactions_90d": transactions,
                "count": len(transactions),
            }
        except Exception as exc:  # pragma: no cover - defensive
            return {"success": False, "error": str(exc)}

    # ---------------------------------------------------------------------
    # Account + profile helpers
    # ---------------------------------------------------------------------
    def get_all_accounts_summary(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Return a concise account summary for UI prompts."""
        try:
            data = self._load_data()
            accounts_payload: List[Dict[str, Any]] = []
            total_balance = 0.0

            for account in data.get("accounts", []):
                balance = account.get("balance", 0)
                total_balance += balance

                accounts_payload.append({
                    "id": account.get("_id"),
                    "type": account.get("type"),
                    "nickname": account.get("nickname"),
                    "balance": balance,
                    "rewards": account.get("rewards", 0),
                    "pending_bills_count": len([
                        bill for bill in account.get("bills", [])
                        if bill.get("status") == "pending"
                    ]),
                    "pending_transactions_count": len([
                        purchase for purchase in account.get("purchases", [])
                        if purchase.get("status") == "pending"
                    ]),
                })

            return {
                "success": True,
                "accounts": accounts_payload,
                "total_balance": total_balance,
                "account_count": len(accounts_payload),
            }
        except Exception as exc:  # pragma: no cover - defensive
            return {"success": False, "error": str(exc)}

    def get_customer_profile(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Return the customer's profile for greeting/wake phrases."""
        try:
            data = self._load_data()
            customer = data.get("customer", {})
            full_name = " ".join(
                part for part in [
                    customer.get("first_name"),
                    customer.get("last_name"),
                ]
                if part
            ).strip()

            return {
                "success": True,
                "customer": {
                    "id": customer.get("_id"),
                    "name": full_name or None,
                    "first_name": customer.get("first_name"),
                    "last_name": customer.get("last_name"),
                    "address": customer.get("address", {}),
                },
            }
        except Exception as exc:  # pragma: no cover - defensive
            return {"success": False, "error": str(exc)}

    # ------------------------------------------------------------------
    # Internal utilities
    # ------------------------------------------------------------------
    def _categorize_transaction(self, description: str) -> str:
        """Lightweight keyword categorization for webhook schemas."""
        text = description.lower()

        if any(keyword in text for keyword in ["grocery", "market", "food"]):
            return "groceries"
        if any(keyword in text for keyword in ["restaurant", "dining", "cafe", "coffee"]):
            return "dining"
        if any(keyword in text for keyword in ["gas", "fuel", "station"]):
            return "gas"
        if any(keyword in text for keyword in ["utility", "electric", "water"]):
            return "utilities"
        if any(keyword in text for keyword in ["paycheck", "salary", "deposit"]):
            return "income"
        if any(keyword in text for keyword in ["uber", "lyft", "transport"]):
            return "transportation"
        return "other"


# Shared instance used by integration modules
financial_tools = FinancialTools()

__all__ = ["financial_tools", "FinancialTools"]
