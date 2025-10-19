"""
Test the new user data service and API endpoints.
"""

import asyncio
from src.services.user_data_service import user_data_service


async def test_user_service():
    print("=" * 70)
    print("USER DATA SERVICE TEST")
    print("=" * 70)
    
    # Test 1: Register a new user
    print("\n[Test 1] Register New User")
    result = user_data_service.register_user(
        email="test@example.com",
        password="test123",
        first_name="Taylor",
        last_name="River",
        zip_code="78701",
        preferences={"primaryColor": "#667EEA"}
    )
    print(f"  Result: {result}")
    print(f"  ✓ User ID: {result.get('user_id')}")
    print(f"  ✓ Linked: {result.get('linked')}")
    print(f"  ✓ Customer ID: {result.get('customer_id')}")
    
    # Test 2: Authenticate the user
    print("\n[Test 2] Authenticate User")
    user = user_data_service.authenticate_user("test@example.com", "test123")
    if user:
        print(f"  ✓ Authentication successful")
        print(f"  ✓ User: {user.get('first_name')} {user.get('last_name')}")
        print(f"  ✓ Customer ID: {user.get('customer_id')}")
    else:
        print(f"  ✗ Authentication failed")
    
    # Test 3: Get complete user data
    if user and user.get('customer_id'):
        print("\n[Test 3] Fetch Complete User Data")
        data = await user_data_service.get_complete_user_data(
            user_id=user.get('id'),
            customer_id=user.get('customer_id')
        )
        
        print(f"  ✓ Linked: {data.get('linked')}")
        
        if data.get('balance'):
            balance = data['balance']
            print(f"  ✓ Total Balance: ${balance.get('total_balance', 0):.2f}")
        
        if data.get('spending_by_category'):
            spending = data['spending_by_category']
            total = sum(v for v in spending.values() if isinstance(v, (int, float)))
            print(f"  ✓ Total Spending: ${total:.2f}")
            for category, amount in list(spending.items())[:3]:
                print(f"    • {category.title()}: ${amount:.2f}")
        
        if data.get('transactions'):
            transactions = data['transactions']
            print(f"  ✓ Transactions: {len(transactions)} found")
    
    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETE!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_user_service())
