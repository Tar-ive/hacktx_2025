"""Local Nessie data repository for offline/demo usage."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import config


class NessieDataRepository:
    """Loads pre-fetched Nessie data from disk and serves it to the app."""

    def __init__(self, data_path: Optional[str] = None) -> None:
        self.data_path = Path(data_path or config.NESSIE_DATA_PATH).expanduser() if config.NESSIE_DATA_PATH else None
        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cache_mtime: float = 0.0

    def _load(self) -> List[Dict[str, Any]]:
        if not self.data_path or not self.data_path.exists():
            return []

        stat = self.data_path.stat()
        if self._cache is not None and stat.st_mtime == self._cache_mtime:
            return self._cache

        raw = json.loads(self.data_path.read_text())
        customers: List[Dict[str, Any]] = []

        # Accept multiple shapes for flexibility (single object or array)
        if isinstance(raw, list):
            for item in raw:
                customer = self._normalize_entry(item)
                if customer:
                    customers.append(customer)
        else:
            customer = self._normalize_entry(raw)
            if customer:
                customers.append(customer)

        self._cache = customers
        self._cache_mtime = stat.st_mtime
        return customers

    @staticmethod
    def _normalize_entry(entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not isinstance(entry, dict):
            return None

        if "customer" in entry and "accounts" in entry:
            customer = dict(entry["customer"])
            customer["accounts"] = entry.get("accounts", [])
            return customer

        # Already in normalized format (customer fields + accounts)
        if entry.get("_id"):
            normalized = dict(entry)
            normalized.setdefault("accounts", [])
            return normalized

        return None

    def has_data(self) -> bool:
        return bool(self._load())

    def list_customers(self) -> List[Dict[str, Any]]:
        return [dict(customer) for customer in self._load()]

    def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        for customer in self._load():
            if customer.get("_id") == customer_id:
                return dict(customer)
        return None

    def get_accounts(self, customer_id: str) -> Optional[List[Dict[str, Any]]]:
        customer = self.get_customer(customer_id)
        if not customer:
            return None
        return [dict(account) for account in customer.get("accounts", [])]


nessie_data_repo = NessieDataRepository()
