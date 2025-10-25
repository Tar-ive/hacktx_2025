"""
Unit tests for the ElevenLabs financial tools.
"""

from agents.tools.financial_tools import financial_tools


def test_get_transactions_90d_shape():
    """Ensure the transaction helper returns the expected structure."""
    result = financial_tools.get_transactions_90d({})
    assert result["success"]
    assert "transactions_90d" in result
    assert isinstance(result["transactions_90d"], list)

    if result["transactions_90d"]:
        transaction = result["transactions_90d"][0]
        assert "_id" in transaction or "id" in transaction
        assert "amount" in transaction
        assert "transaction_date" in transaction
        assert "status" in transaction


def test_get_all_accounts_summary_shape():
    """Accounts summary should expose totals and metadata."""
    result = financial_tools.get_all_accounts_summary({})
    assert result["success"]
    assert "accounts" in result
    assert isinstance(result["accounts"], list)
    assert "total_balance" in result


def test_get_customer_profile_shape():
    """Customer profile helper should surface core identity."""
    result = financial_tools.get_customer_profile({})
    assert result["success"]
    customer = result["customer"]
    assert "first_name" in customer
    assert "last_name" in customer
    assert "id" in customer
