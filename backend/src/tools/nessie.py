"""
Nessie API tools for parallel execution.
These tools are called by the orchestrator, NOT by agents directly.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any
from ..services.nessie_client import nessie_client
from ..services.nessie_data_repository import nessie_data_repo
from ..cache.manager import CacheManager
from ..config import config

# Global cache manager
cache = CacheManager()


async def get_customer_info(customer_id: str) -> Dict[str, Any]:
    """Get customer profile information."""
    if nessie_data_repo.has_data():
        customer = nessie_data_repo.get_customer(customer_id)
        if customer:
            return customer

    async def fetcher():
        return await nessie_client.get_customer(customer_id)

    result = await cache.get_with_fallback(f"customer:{customer_id}", fetcher)
    return result["data"]


async def get_all_accounts(customer_id: str) -> List[Dict]:
    """Get all accounts for a customer."""
    if nessie_data_repo.has_data():
        accounts = nessie_data_repo.get_accounts(customer_id)
        if accounts is not None:
            return accounts

    async def fetcher():
        data = await nessie_client.get_full_customer_data(customer_id)
        return data["accounts"]

    result = await cache.get_with_fallback(f"accounts:{customer_id}", fetcher)
    # Handle both wrapped and unwrapped responses
    accounts = result.get("data") if isinstance(result, dict) and "data" in result else result
    return accounts if isinstance(accounts, list) else []


async def get_account_balance(customer_id: str) -> Dict[str, float]:
    """Get total balance across all accounts."""
    accounts = await get_all_accounts(customer_id)
    
    # Ensure accounts is a list
    if not isinstance(accounts, list):
        return {"total_balance": 0, "total_rewards": 0, "num_accounts": 0, "accounts": []}

    total_balance = sum(acc.get("balance", 0) if isinstance(acc, dict) else 0 for acc in accounts)
    total_rewards = sum(acc.get("rewards", 0) if isinstance(acc, dict) else 0 for acc in accounts)

    account_summaries = []
    for acc in accounts:
        if not isinstance(acc, dict):
            continue
        account_summaries.append({
            "account_id": acc.get("_id"),
            "type": acc.get("type"),
            "balance": acc.get("balance", 0),
            "nickname": acc.get("nickname"),
            "rewards": acc.get("rewards", 0)
        })

    return {
        "total_balance": total_balance,
        "total_rewards": total_rewards,
        "num_accounts": len(accounts),
        "accounts": account_summaries
    }


async def get_recent_transactions(customer_id: str, days: int = 30) -> List[Dict]:
    """Get recent transactions (purchases) across all accounts."""
    accounts = await get_all_accounts(customer_id)

    # Calculate cutoff date
    cutoff_date = datetime.now() - timedelta(days=days)

    all_transactions = []
    for account in accounts:
        purchases = account.get("purchases", [])
        for purchase in purchases:
            purchase_date_str = purchase.get("purchase_date", "")
            try:
                purchase_date = datetime.fromisoformat(purchase_date_str)
                if purchase_date >= cutoff_date:
                    all_transactions.append({
                        **purchase,
                        "account_id": account["_id"],
                        "account_type": account["type"]
                    })
            except (ValueError, TypeError):
                # Skip invalid dates
                continue

    # Sort by date descending
    all_transactions.sort(
        key=lambda x: x.get("purchase_date", ""),
        reverse=True
    )

    return all_transactions


async def get_spending_by_category(customer_id: str, days: int = 30) -> Dict[str, float]:
    """Analyze spending by category (simplified categorization)."""
    transactions = await get_recent_transactions(customer_id, days)

    # Simple categorization based on description keywords
    categories = {
        "groceries": ["grocery", "market", "food"],
        "dining": ["restaurant", "cafe", "coffee", "starbucks"],
        "gas": ["gas", "fuel", "gasoline"],
        "utilities": ["utility", "electric", "water"],
        "shopping": ["shop", "store", "amazon"],
        "other": []
    }

    spending_by_category = {cat: 0.0 for cat in categories.keys()}

    for trans in transactions:
        amount = trans.get("amount", 0)
        description = trans.get("description", "").lower()

        categorized = False
        for category, keywords in categories.items():
            if any(keyword in description for keyword in keywords):
                spending_by_category[category] += amount
                categorized = True
                break

        if not categorized:
            spending_by_category["other"] += amount

    return spending_by_category


async def analyze_spending_patterns(customer_id: str) -> Dict[str, Any]:
    """Analyze spending patterns and trends."""
    transactions_30 = await get_recent_transactions(customer_id, days=30)
    transactions_60 = await get_recent_transactions(customer_id, days=60)

    # Calculate totals
    total_30_days = sum(t.get("amount", 0) for t in transactions_30)
    total_60_days = sum(t.get("amount", 0) for t in transactions_60)
    total_30_to_60 = total_60_days - total_30_days

    # Calculate averages
    avg_30_days = total_30_days / 30 if transactions_30 else 0
    avg_30_to_60 = total_30_to_60 / 30 if total_30_to_60 > 0 else 0

    # Calculate trend
    if avg_30_to_60 > 0:
        trend_percent = ((avg_30_days - avg_30_to_60) / avg_30_to_60) * 100
    else:
        trend_percent = 0

    return {
        "total_last_30_days": round(total_30_days, 2),
        "total_previous_30_days": round(total_30_to_60, 2),
        "average_daily_spending": round(avg_30_days, 2),
        "trend_percent": round(trend_percent, 2),
        "trend": "increasing" if trend_percent > 5 else "decreasing" if trend_percent < -5 else "stable",
        "transaction_count": len(transactions_30)
    }


async def get_upcoming_bills(customer_id: str) -> List[Dict]:
    """Get upcoming bills across all accounts."""
    accounts = await get_all_accounts(customer_id)

    all_bills = []
    for account in accounts:
        bills = account.get("bills", [])
        for bill in bills:
            all_bills.append({
                **bill,
                "account_id": account["_id"]
            })

    # Sort by payment date
    all_bills.sort(key=lambda x: x.get("payment_date", ""))

    return all_bills


async def get_deposits_history(customer_id: str, months: int = 12) -> List[Dict]:
    """Get deposit history for income analysis."""
    accounts = await get_all_accounts(customer_id)

    cutoff_date = datetime.now() - timedelta(days=months * 30)

    all_deposits = []
    for account in accounts:
        deposits = account.get("deposits", [])
        for deposit in deposits:
            transaction_date_str = deposit.get("transaction_date", "")
            try:
                transaction_date = datetime.fromisoformat(transaction_date_str)
                if transaction_date >= cutoff_date:
                    all_deposits.append({
                        **deposit,
                        "account_id": account["_id"]
                    })
            except (ValueError, TypeError):
                continue

    all_deposits.sort(key=lambda x: x.get("transaction_date", ""), reverse=True)

    return all_deposits


async def calculate_savings_rate(customer_id: str) -> Dict[str, Any]:
    """Calculate savings rate based on deposits and spending."""
    deposits = await get_deposits_history(customer_id, months=3)
    transactions = await get_recent_transactions(customer_id, days=90)

    total_income = sum(d.get("amount", 0) for d in deposits)
    total_spending = sum(t.get("amount", 0) for t in transactions)

    savings = total_income - total_spending
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0

    return {
        "total_income_90_days": round(total_income, 2),
        "total_spending_90_days": round(total_spending, 2),
        "net_savings": round(savings, 2),
        "savings_rate_percent": round(savings_rate, 2)
    }


async def detect_unusual_transactions(customer_id: str, threshold: float = 2.5) -> List[Dict]:
    """Detect unusual transactions using statistical analysis."""
    transactions = await get_recent_transactions(customer_id, days=60)

    if not transactions:
        return []

    # Calculate mean and standard deviation
    amounts = [t.get("amount", 0) for t in transactions]
    mean = sum(amounts) / len(amounts)
    variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
    std_dev = variance ** 0.5

    # Find transactions beyond threshold
    unusual = []
    for trans in transactions:
        amount = trans.get("amount", 0)
        z_score = (amount - mean) / std_dev if std_dev > 0 else 0

        if abs(z_score) > threshold:
            unusual.append({
                **trans,
                "z_score": round(z_score, 2),
                "reason": f"${amount:.2f} is {z_score:.1f} standard deviations from average"
            })

    return unusual


async def get_security_score(customer_id: str) -> Dict[str, Any]:
    """Calculate a simple security score."""
    unusual_trans = await detect_unusual_transactions(customer_id)
    recent_trans = await get_recent_transactions(customer_id, days=7)

    # Simple scoring
    score = 100

    # Deduct points for unusual activity
    score -= len(unusual_trans) * 5
    score -= len(recent_trans) * 0.5  # More activity = slightly higher risk

    score = max(0, min(100, score))

    return {
        "security_score": round(score, 1),
        "unusual_transactions_count": len(unusual_trans),
        "recent_activity_count": len(recent_trans),
        "assessment": "high" if score >= 80 else "medium" if score >= 60 else "low"
    }


# Tools registry for ToolExecutor
TOOLS_REGISTRY = {
    "get_customer_info": get_customer_info,
    "get_all_accounts": get_all_accounts,
    "get_account_balance": get_account_balance,
    "get_recent_transactions": get_recent_transactions,
    "get_spending_by_category": get_spending_by_category,
    "analyze_spending_patterns": analyze_spending_patterns,
    "get_upcoming_bills": get_upcoming_bills,
    "get_deposits_history": get_deposits_history,
    "calculate_savings_rate": calculate_savings_rate,
    "detect_unusual_transactions": detect_unusual_transactions,
    "get_security_score": get_security_score,
}
