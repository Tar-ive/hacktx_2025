"""Centralized User Data Service.

Responsible for:
- Persisting app users (email/password + preferences)
- Matching newly registered users with existing Capital One (Nessie) customers
- Providing complete financial context (via the centralized data manager)
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, List

from ..config import config
from ..services.nessie_client import nessie_client
from ..services.centralized_data_manager import centralized_data_manager
from ..services.nessie_data_repository import nessie_data_repo


class UserDataService:
    """Service for managing user data and linking with Capital One accounts."""
    
    def __init__(self):
        self.user_file = Path(config.USER_DATA_FILE)
        self._ensure_user_file()

        # Cache of Nessie customers so we don't hammer the API on every match request
        self._customers_cache: List[Dict[str, Any]] = []
        self._customer_cache_timestamp: float = 0.0
        self._customer_cache_ttl: int = 600  # 10 minutes
    
    def _ensure_user_file(self):
        """Ensure user data file exists."""
        if not self.user_file.exists():
            self.user_file.parent.mkdir(parents=True, exist_ok=True)
            self.user_file.write_text(json.dumps({"users": []}, indent=2))
    
    def _load_users(self) -> Dict[str, Any]:
        """Load users from file."""
        try:
            return json.loads(self.user_file.read_text())
        except Exception as e:
            print(f"⚠️  Error loading users: {e}")
            return {"users": []}
    
    def _save_users(self, data: Dict[str, Any]):
        """Save users to file."""
        try:
            self.user_file.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"⚠️  Error saving users: {e}")
    
    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user and return user data if credentials match.
        
        Returns:
            User dict with customer_id if authenticated, None otherwise
        """
        data = self._load_users()
        
        for user in data.get("users", []):
            if user.get("email") == email and user.get("password") == password:
                return user
        
        return None
    
    async def register_user(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        zip_code: str,
        preferences: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Register a new ReBank user and link their Capital One account if found."""

        data = self._load_users()

        # Prevent duplicate accounts
        for user in data.get("users", []):
            if user.get("email") == email:
                return {"error": "User with this email already exists", "linked": False}

        user_id = f"user_{len(data.get('users', [])) + 1}"

        match_result = await self.match_customer(first_name, last_name, zip_code)
        customer_id = match_result.get("customer_id") if match_result.get("matched") else None

        new_user = {
            "id": user_id,
            "email": email,
            "password": password,  # NOTE: hash in production
            "first_name": first_name,
            "last_name": last_name,
            "zip_code": zip_code,
            "customer_id": customer_id,
            "preferences": preferences or {},
        }

        data.setdefault("users", []).append(new_user)
        self._save_users(data)

        # Warm the centralized cache so downstream calls are instant
        if customer_id:
            try:
                await centralized_data_manager.fetch_and_store_all_data(customer_id)
            except Exception as exc:  # noqa: BLE001 - log and continue
                print(f"⚠️  Unable to prefetch data for {customer_id}: {exc}")

        return {
            "user_id": user_id,
            "customer_id": customer_id,
            "linked": customer_id is not None,
            "message": "Account linked successfully!" if customer_id else "Account created. Link your Capital One account to see your data.",
            "match": match_result,
            "profile": {
                "first_name": first_name,
                "last_name": last_name,
                "zip_code": zip_code,
                "preferences": preferences or {},
            },
        }

    async def match_customer(
        self,
        first_name: str,
        last_name: str,
        zip_code: str,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Attempt to match the provided identity with a Nessie customer."""

        customers = await self._get_cached_customers(force_refresh=force_refresh)

        first = first_name.strip().lower()
        last = last_name.strip().lower()
        zip_code = zip_code.strip()

        best_score = 0
        best_customer: Optional[Dict[str, Any]] = None
        reasons: List[str] = []

        for customer in customers:
            score = 0
            customer_first = customer.get("first_name", "").strip().lower()
            customer_last = customer.get("last_name", "").strip().lower()
            customer_zip = customer.get("address", {}).get("zip", "").strip()

            if not customer_first or not customer_last:
                continue

            local_reasons: List[str] = []

            if customer_first == first and customer_last == last:
                score += 60
                local_reasons.append("Exact name match")
            elif customer_first == first or customer_last == last:
                score += 40
                local_reasons.append("Partial name match")
            elif first in customer_first or last in customer_last:
                score += 20
                local_reasons.append("Fuzzy name match")

            if customer_zip and customer_zip == zip_code:
                score += 30
                local_reasons.append("ZIP match")

            if score > best_score:
                best_score = score
                best_customer = customer
                reasons = local_reasons

        if best_customer and best_score >= 60:
            return {
                "matched": True,
                "confidence": min(best_score, 100) / 100,
                "match_reason": ", ".join(reasons) or "High confidence match",
                "customer_id": best_customer.get("_id"),
                "customer": best_customer,
            }

        return {
            "matched": False,
            "confidence": best_score / 100,
            "match_reason": "No confident match found",
            "customer": None,
        }

    async def _get_cached_customers(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Fetch and cache the list of Nessie customers."""

        # Prefer local repository for deterministic demo data
        repo_customers = nessie_data_repo.list_customers()
        if repo_customers:
            return repo_customers

        now = time.time()
        if (
            not force_refresh
            and self._customers_cache
            and (now - self._customer_cache_timestamp) < self._customer_cache_ttl
        ):
            return self._customers_cache

        try:
            customers = await nessie_client.list_customers()
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  Unable to fetch customers from Nessie: {exc}")
            return self._customers_cache  # Return stale cache if available

        if isinstance(customers, list):
            self._customers_cache = customers
            self._customer_cache_timestamp = now

        return self._customers_cache

    async def get_complete_user_data(
        self,
        user_id: str = None,
        customer_id: str = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Return complete financial context for the specified user/customer."""

        if not customer_id and user_id:
            data = self._load_users()
            for user in data.get("users", []):
                if user.get("id") == user_id:
                    customer_id = user.get("customer_id")
                    break

        if not customer_id:
            return {"error": "No Capital One account linked", "linked": False}

        try:
            data = await centralized_data_manager.get_or_refresh_data(
                customer_id, max_age_seconds=0 if force_refresh else 3600
            )
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  Error retrieving centralized data: {exc}")
            return {
                "error": str(exc),
                "linked": True,
                "customer_id": customer_id,
            }

        if not data:
            return {
                "error": "No data available for customer",
                "linked": True,
                "customer_id": customer_id,
            }

        return {
            "linked": True,
            "customer_id": customer_id,
            "customer": data.get("customer"),
            "accounts": data.get("accounts", []),
            "balance": data.get("balance"),
            "transactions_30d": data.get("transactions_30d", []),
            "transactions_90d": data.get("transactions_90d", []),
            "spending_by_category": data.get("spending_by_category", {}),
            "spending_patterns": data.get("spending_patterns", {}),
            "deposits_history": data.get("deposits_history", []),
            "unusual_transactions": data.get("unusual_transactions", []),
            "insights": data.get("insights", {}),
            "metadata": data.get("_metadata", {}),
        }


# Global instance
user_data_service = UserDataService()
