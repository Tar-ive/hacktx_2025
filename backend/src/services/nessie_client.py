"""Nessie API HTTP client wrapper."""

import httpx
from typing import Dict, List, Any, Optional
from ..config import config


class NessieClient:
    """HTTP client for Capital One Nessie API."""

    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or config.NESSIE_API_KEY
        self.base_url = base_url or config.NESSIE_API_BASE
        self.timeout = 10.0

    def _build_url(self, path: str) -> str:
        """Build full URL with API key."""
        separator = "&" if "?" in path else "?"
        return f"{self.base_url}{path}{separator}key={self.api_key}"

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        """Make HTTP request to Nessie API."""
        url = self._build_url(path)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()

            if response.status_code == 204:
                return None

            return response.json()

    async def get_customer(self, customer_id: str) -> Dict:
        """Get customer information."""
        return await self._request("GET", f"/customers/{customer_id}")

    async def get_accounts(self, customer_id: str) -> List[Dict]:
        """Get all accounts for a customer."""
        return await self._request("GET", f"/customers/{customer_id}/accounts")

    async def list_customers(self) -> List[Dict]:
        """List all customers available for the API key."""
        return await self._request("GET", "/customers")

    async def get_account(self, account_id: str) -> Dict:
        """Get specific account details."""
        return await self._request("GET", f"/accounts/{account_id}")

    async def get_purchases(self, account_id: str) -> List[Dict]:
        """Get all purchases for an account."""
        try:
            result = await self._request("GET", f"/accounts/{account_id}/purchases")
            return result if result else []
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return []
            raise

    async def get_deposits(self, account_id: str) -> List[Dict]:
        """Get all deposits for an account."""
        try:
            result = await self._request("GET", f"/accounts/{account_id}/deposits")
            return result if result else []
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return []
            raise

    async def get_bills(self, account_id: str) -> List[Dict]:
        """Get all bills for an account."""
        try:
            result = await self._request("GET", f"/accounts/{account_id}/bills")
            return result if result else []
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return []
            raise

    async def get_full_customer_data(self, customer_id: str) -> Dict[str, Any]:
        """
        Get complete customer data including all accounts and transactions.
        This is the main method for the cache buffer.
        """
        # Fetch customer and accounts
        customer = await self.get_customer(customer_id)
        accounts = await self.get_accounts(customer_id)

        # Enrich each account with transactions
        enriched_accounts = []
        for account in accounts:
            account_id = account["_id"]

            # Fetch all transaction types in parallel would be ideal,
            # but for simplicity doing sequentially
            purchases = await self.get_purchases(account_id)
            deposits = await self.get_deposits(account_id)
            bills = await self.get_bills(account_id)

            enriched_account = {
                **account,
                "purchases": purchases,
                "deposits": deposits,
                "bills": bills
            }
            enriched_accounts.append(enriched_account)

        return {
            "customer": customer,
            "accounts": enriched_accounts
        }


# Global client instance
nessie_client = NessieClient()
