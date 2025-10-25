"""
Centralized Data Manager
Stores all user financial data in ONE location (~/.rebank/user_data/)
Both backend AI agents and frontend mobile app read from here.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import os

from ..tools.nessie import (
    get_all_accounts,
    get_account_balance,
    get_recent_transactions,
    get_customer_info,
    get_spending_by_category,
    analyze_spending_patterns,
    detect_unusual_transactions,
    get_deposits_history,
)
from ..services.nessie_data_repository import nessie_data_repo


class CentralizedDataManager:
    """
    Centralized data storage for all users.
    Stores in ~/.rebank/user_data/{customer_id}.json
    """
    
    def __init__(self, base_dir: Optional[str] = None):
        # Use home directory for centralized storage
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            home = Path.home()
            self.base_dir = home / ".rebank" / "user_data"
        
        self.base_dir.mkdir(parents=True, exist_ok=True)
        print(f"📁 Centralized data directory: {self.base_dir}")
    
    def _get_user_file(self, customer_id: str) -> Path:
        """Get the file path for a specific customer."""
        return self.base_dir / f"{customer_id}.json"
    
    async def fetch_and_store_all_data(self, customer_id: str) -> Dict[str, Any]:
        """
        Fetch ALL financial data from Nessie and store in centralized location.
        This is the SINGLE SOURCE OF TRUTH for user data.
        
        Returns the complete data structure.
        """
        print(f"🔄 Fetching complete data for customer {customer_id}...")
        
        # Fetch all data in parallel
        data = {}
        
        try:
            # Customer profile (name, address, etc.)
            customer_info = await get_customer_info(customer_id)
            if not customer_info and nessie_data_repo.has_data():
                customer_info = nessie_data_repo.get_customer(customer_id)
            data["customer"] = customer_info or {}

            # Basic account info
            accounts = await get_all_accounts(customer_id)
            if (not accounts) and nessie_data_repo.has_data():
                accounts = nessie_data_repo.get_accounts(customer_id) or []
            data["accounts"] = accounts
            data["balance"] = await get_account_balance(customer_id)
            
            # Transaction data
            data["transactions_30d"] = await get_recent_transactions(customer_id, days=30)
            data["transactions_90d"] = await get_recent_transactions(customer_id, days=90)
            
            # Spending analysis
            data["spending_by_category"] = await get_spending_by_category(customer_id, days=30)
            data["spending_patterns"] = await analyze_spending_patterns(customer_id)
            
            # Deposits
            data["deposits_history"] = await get_deposits_history(customer_id, months=12)
            
            # Security
            data["unusual_transactions"] = await detect_unusual_transactions(customer_id)
            
            # Calculate additional insights
            data["insights"] = self._calculate_insights(data)
            
            # Metadata
            data["_metadata"] = {
                "customer_id": customer_id,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "version": "1.0"
            }
            
            # Store in centralized location
            self._save_data(customer_id, data)
            
            print(f"✓ Stored complete data for {customer_id}")
            return data
            
        except Exception as e:
            print(f"⚠️  Error fetching data for {customer_id}: {e}")
            # Try to return cached data if available
            cached = self.load_data(customer_id)
            if cached:
                print(f"✓ Returning cached data for {customer_id}")
                return cached
            raise
    
    def _calculate_insights(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate additional insights from the data."""
        insights = {}
        
        # Monthly spending trend
        if "spending_patterns" in data and data["spending_patterns"]:
            patterns = data["spending_patterns"]
            insights["monthly_spending"] = patterns.get("total_last_30_days", 0)
            insights["average_transaction"] = patterns.get("average_transaction_amount", 0)
        
        # Top spending category
        if "spending_by_category" in data and data["spending_by_category"]:
            spending = data["spending_by_category"]
            if spending:
                top_category = max(spending.items(), key=lambda x: x[1])
                insights["top_spending_category"] = {
                    "category": top_category[0],
                    "amount": top_category[1]
                }
        
        # Account summary
        if "balance" in data and data["balance"]:
            insights["total_balance"] = data["balance"].get("total_balance", 0)
            insights["num_accounts"] = len(data["balance"].get("accounts", []))
        
        # Transaction counts
        if "transactions_30d" in data:
            insights["transaction_count_30d"] = len(data["transactions_30d"])
        
        # Security status
        if "unusual_transactions" in data:
            unusual = data["unusual_transactions"]
            if isinstance(unusual, list):
                insights["unusual_transaction_count"] = len(unusual)
                insights["security_alert"] = len(unusual) > 0
        
        return insights
    
    def _save_data(self, customer_id: str, data: Dict[str, Any]):
        """Save data to centralized location."""
        file_path = self._get_user_file(customer_id)
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def load_data(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Load data from centralized location.
        This is used by:
        - Backend AI agents to get context
        - API endpoints to serve to mobile
        - Any service that needs user data
        """
        file_path = self._get_user_file(customer_id)
        
        if not file_path.exists():
            print(f"⚠️  No data found for customer {customer_id}")
            return None
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Check if data is stale (older than 1 hour)
            if "_metadata" in data:
                last_updated = datetime.fromisoformat(data["_metadata"]["last_updated"])
                age = (datetime.now(timezone.utc) - last_updated).total_seconds()
                if age > 3600:  # 1 hour
                    print(f"⚠️  Data for {customer_id} is {age/60:.0f} minutes old")
            
            return data
            
        except Exception as e:
            print(f"⚠️  Error loading data for {customer_id}: {e}")
            return None
    
    def get_data_age(self, customer_id: str) -> Optional[float]:
        """Get the age of cached data in seconds."""
        data = self.load_data(customer_id)
        if not data or "_metadata" not in data:
            return None
        
        last_updated = datetime.fromisoformat(data["_metadata"]["last_updated"])
        return (datetime.now(timezone.utc) - last_updated).total_seconds()
    
    def should_refresh(self, customer_id: str, max_age_seconds: int = 3600) -> bool:
        """Check if data should be refreshed."""
        age = self.get_data_age(customer_id)
        if age is None:
            return True  # No data, need to fetch
        return age > max_age_seconds
    
    async def get_or_refresh_data(
        self, 
        customer_id: str, 
        max_age_seconds: int = 3600
    ) -> Dict[str, Any]:
        """
        Get data from cache, or refresh if stale.
        This is the main method to use for getting user data.
        """
        if self.should_refresh(customer_id, max_age_seconds):
            print(f"🔄 Refreshing data for {customer_id}")
            return await self.fetch_and_store_all_data(customer_id)
        else:
            print(f"✓ Using cached data for {customer_id}")
            return self.load_data(customer_id)


# Global instance
centralized_data_manager = CentralizedDataManager()
