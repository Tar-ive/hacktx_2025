#!/bin/bash

# Voice Banking API Test Script
# Tests all API endpoints with curl

BASE_URL="${BASE_URL:-http://localhost:8000}"
CUSTOMER_ID="${CUSTOMER_ID:-68f42c289683f20dd51a0293}"
ACCOUNT_ID="${ACCOUNT_ID:-68f42c519683f20dd51a0296}"

echo "=========================================="
echo "Voice Banking API Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Customer ID: $CUSTOMER_ID"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Test 1: Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$BASE_URL/health" | python3 -m json.tool
echo -e "\n"

# Test 2: Get Customer Data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Get Customer Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$BASE_URL/api/v1/customer/$CUSTOMER_ID" | python3 -m json.tool
echo -e "\n"

# Test 3: Get Account Transactions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Get Account Transactions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$BASE_URL/api/v1/accounts/$ACCOUNT_ID/transactions?days=30" | python3 -m json.tool
echo -e "\n"

# Test 4: Agent Selection - Nebula (spending)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Agent Selection - Nebula"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/v1/agent/select" \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend on groceries this week?"}' | python3 -m json.tool
echo -e "\n"

# Test 5: Agent Selection - Atlas (investment)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Agent Selection - Atlas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/v1/agent/select" \
  -H "Content-Type: application/json" \
  -d '{"message": "How should I invest for retirement?"}' | python3 -m json.tool
echo -e "\n"

# Test 6: Agent Selection - Sentinel (security)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Agent Selection - Sentinel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/v1/agent/select" \
  -H "Content-Type: application/json" \
  -d '{"message": "I see a suspicious charge on my account"}' | python3 -m json.tool
echo -e "\n"

# Test 7: Agent Selection - Nova (fallback)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: Agent Selection - Nova"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/v1/agent/select" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my account balance?"}' | python3 -m json.tool
echo -e "\n"

# Test 8: Send Chat Message
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Send Chat Message"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/v1/chat/message" \
  -H "Content-Type: application/json" \
  -d "{\"customer_id\": \"$CUSTOMER_ID\", \"message\": \"How much did I spend on groceries this week?\"}" | python3 -m json.tool
echo -e "\n"

# Test 9: Cache Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 9: Cache Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$BASE_URL/api/v1/cache/status" | python3 -m json.tool
echo -e "\n"

# Test 10: Force Cache Refresh
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 10: Force Cache Refresh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$BASE_URL/api/v1/cache/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"customer_id\": \"$CUSTOMER_ID\"}" | python3 -m json.tool
echo -e "\n"

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
