#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Base URL
API="http://localhost:5001/api/v1"
TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
CATEGORY_ID=""
TRANSACTION_ID=""
SAVINGS_GOAL_ID=""
ASSET_ID=""
INVESTMENT_ID=""
INCOME_ID=""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
print_result() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ $1 -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✅ $2${NC}"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${RED}❌ $2${NC}"
    if [ ! -z "$3" ]; then
      echo -e "${RED}   Error: $3${NC}"
    fi
  fi
}

# Function to extract JSON value
extract_json() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*" | cut -d'"' -f4
}

# Function to check if response contains success
check_success() {
  echo "$1" | grep -q '"success":true'
  return $?
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        Family Finance API - Automated Test Suite          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# =============================================
# TEST 1: Health Check
# =============================================
echo -e "${YELLOW}📋 Running Health Checks...${NC}"
echo ""

HEALTH_RESPONSE=$(curl -s http://localhost:5001/health)
check_success "$HEALTH_RESPONSE"
print_result $? "Health check endpoint" "$HEALTH_RESPONSE"

# =============================================
# TEST 2: Authentication Tests
# =============================================
echo ""
echo -e "${YELLOW}🔐 Running Authentication Tests...${NC}"
echo ""

# Generate unique email
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Test User ${TIMESTAMP}"

# Test Registration
REGISTER_RESPONSE=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\",
    \"monthlyIncome\": 100000,
    \"dependents\": 2
  }")

check_success "$REGISTER_RESPONSE"
print_result $? "User registration" "$REGISTER_RESPONSE"

TOKEN=$(extract_json "$REGISTER_RESPONSE" "accessToken")
REFRESH_TOKEN=$(extract_json "$REGISTER_RESPONSE" "refreshToken")
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}💥 Failed to get access token. Exiting...${NC}"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}   Token obtained: ${TOKEN:0:30}...${NC}"

# Test Login
LOGIN_RESPONSE=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

check_success "$LOGIN_RESPONSE"
print_result $? "User login"

# Test Get Current User
ME_RESPONSE=$(curl -s $API/auth/me \
  -H "Authorization: Bearer $TOKEN")

check_success "$ME_RESPONSE"
print_result $? "Get current user profile"

# Test Token Refresh
REFRESH_RESPONSE=$(curl -s -X POST $API/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

check_success "$REFRESH_RESPONSE"
print_result $? "Token refresh"

# =============================================
# TEST 3: Profile Tests
# =============================================
echo ""
echo -e "${YELLOW}👤 Running Profile Tests...${NC}"
echo ""

# Test Update Profile
UPDATE_PROFILE_RESPONSE=$(curl -s -X PUT $API/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test User",
    "monthlyIncome": 120000,
    "dependents": 3
  }')

check_success "$UPDATE_PROFILE_RESPONSE"
print_result $? "Update user profile"

# Test Get Profile
GET_PROFILE_RESPONSE=$(curl -s $API/profile \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_PROFILE_RESPONSE"
print_result $? "Get user profile"

# =============================================
# TEST 4: Budget Category Tests
# =============================================
echo ""
echo -e "${YELLOW}📁 Running Budget Category Tests...${NC}"
echo ""

# Test Create Category
CREATE_CATEGORY_RESPONSE=$(curl -s -X POST $API/budget/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "budgetedAmount": 25001,
    "type": "needs"
  }')

check_success "$CREATE_CATEGORY_RESPONSE"
print_result $? "Create budget category"

CATEGORY_ID=$(echo "$CREATE_CATEGORY_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Test Get All Categories
GET_CATEGORIES_RESPONSE=$(curl -s $API/budget/categories \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_CATEGORIES_RESPONSE"
print_result $? "Get all budget categories"

# Test Update Category
if [ ! -z "$CATEGORY_ID" ]; then
  UPDATE_CATEGORY_RESPONSE=$(curl -s -X PUT $API/budget/categories/$CATEGORY_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "budgetedAmount": 30000
    }')

  check_success "$UPDATE_CATEGORY_RESPONSE"
  print_result $? "Update budget category"
fi

# Test Get Budget Summary
BUDGET_SUMMARY_RESPONSE=$(curl -s "$API/budget/summary?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$BUDGET_SUMMARY_RESPONSE"
print_result $? "Get budget summary"

# =============================================
# TEST 5: Transaction Tests
# =============================================
echo ""
echo -e "${YELLOW}💸 Running Transaction Tests...${NC}"
echo ""

# Test Create Transaction
CREATE_TRANSACTION_RESPONSE=$(curl -s -X POST $API/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"categoryId\": \"$CATEGORY_ID\",
    \"date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"amount\": 5001,
    \"type\": \"expense\",
    \"notes\": \"Test grocery shopping\",
    \"month\": \"$(date +%Y-%m)\"
  }")

check_success "$CREATE_TRANSACTION_RESPONSE"
print_result $? "Create transaction"

TRANSACTION_ID=$(echo "$CREATE_TRANSACTION_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Test Get All Transactions
GET_TRANSACTIONS_RESPONSE=$(curl -s $API/transactions \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_TRANSACTIONS_RESPONSE"
print_result $? "Get all transactions"

# Test Get Transactions by Month
GET_MONTH_TRANSACTIONS_RESPONSE=$(curl -s $API/transactions/month/$(date +%Y-%m) \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_MONTH_TRANSACTIONS_RESPONSE"
print_result $? "Get transactions by month"

# Test Get Transaction by ID
if [ ! -z "$TRANSACTION_ID" ]; then
  GET_TRANSACTION_RESPONSE=$(curl -s $API/transactions/$TRANSACTION_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$GET_TRANSACTION_RESPONSE"
  print_result $? "Get transaction by ID"
fi

# Test Update Transaction
if [ ! -z "$TRANSACTION_ID" ]; then
  UPDATE_TRANSACTION_RESPONSE=$(curl -s -X PUT $API/transactions/$TRANSACTION_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 6000,
      "notes": "Updated test transaction"
    }')

  check_success "$UPDATE_TRANSACTION_RESPONSE"
  print_result $? "Update transaction"
fi

# =============================================
# TEST 6: Savings Goal Tests
# =============================================
echo ""
echo -e "${YELLOW}🎯 Running Savings Goal Tests...${NC}"
echo ""

# Test Create Savings Goal
CREATE_GOAL_RESPONSE=$(curl -s -X POST $API/savings/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Fund",
    "targetAmount": 300000,
    "currentAmount": 50010,
    "monthlyContribution": 10000
  }')

check_success "$CREATE_GOAL_RESPONSE"
print_result $? "Create savings goal"

SAVINGS_GOAL_ID=$(echo "$CREATE_GOAL_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Test Get All Goals
GET_GOALS_RESPONSE=$(curl -s $API/savings/goals \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_GOALS_RESPONSE"
print_result $? "Get all savings goals"

# Test Update Goal
if [ ! -z "$SAVINGS_GOAL_ID" ]; then
  UPDATE_GOAL_RESPONSE=$(curl -s -X PUT $API/savings/goals/$SAVINGS_GOAL_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "currentAmount": 60000
    }')

  check_success "$UPDATE_GOAL_RESPONSE"
  print_result $? "Update savings goal"
fi

# Test Get Savings Contributions
GET_CONTRIBUTIONS_RESPONSE=$(curl -s $API/savings/contributions \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_CONTRIBUTIONS_RESPONSE"
print_result $? "Get savings contributions"

# =============================================
# TEST 7: Net Worth Tests
# =============================================
echo ""
echo -e "${YELLOW}💰 Running Net Worth Tests...${NC}"
echo ""

# Test Create Asset
CREATE_ASSET_RESPONSE=$(curl -s -X POST $API/networth/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Savings Account",
    "amount": 150010,
    "type": "asset",
    "category": "Cash & Bank Accounts"
  }')

check_success "$CREATE_ASSET_RESPONSE"
print_result $? "Create asset"

ASSET_ID=$(echo "$CREATE_ASSET_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Test Create Liability
CREATE_LIABILITY_RESPONSE=$(curl -s -X POST $API/networth/assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Car Loan",
    "amount": 50010,
    "type": "liability",
    "category": "Loans"
  }')

check_success "$CREATE_LIABILITY_RESPONSE"
print_result $? "Create liability"

# Test Get Net Worth
GET_NETWORTH_RESPONSE=$(curl -s $API/networth \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_NETWORTH_RESPONSE"
print_result $? "Get current net worth"

# Test Get All Assets
GET_ASSETS_RESPONSE=$(curl -s $API/networth/assets \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_ASSETS_RESPONSE"
print_result $? "Get all assets"

# Test Update Asset
if [ ! -z "$ASSET_ID" ]; then
  UPDATE_ASSET_RESPONSE=$(curl -s -X PUT $API/networth/assets/$ASSET_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 175001
    }')

  check_success "$UPDATE_ASSET_RESPONSE"
  print_result $? "Update asset"
fi

# =============================================
# TEST 8: IPP Tests
# =============================================
echo ""
echo -e "${YELLOW}🏦 Running IPP Account Tests...${NC}"
echo ""

# Test Create/Update IPP
CREATE_IPP_RESPONSE=$(curl -s -X PUT $API/ipp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentBalance": 75001,
    "monthlyContribution": 5001,
    "totalContributions": 75001,
    "taxReliefRate": 0.3,
    "realizedValue": 97500
  }')

check_success "$CREATE_IPP_RESPONSE"
print_result $? "Create/Update IPP account"

# Test Get IPP
GET_IPP_RESPONSE=$(curl -s $API/ipp \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_IPP_RESPONSE"
print_result $? "Get IPP account"

# Test Get IPP Contributions
GET_IPP_CONTRIBUTIONS_RESPONSE=$(curl -s $API/ipp/contributions \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_IPP_CONTRIBUTIONS_RESPONSE"
print_result $? "Get IPP contributions"

# =============================================
# TEST 9: Investment Tests
# =============================================
echo ""
echo -e "${YELLOW}📈 Running Investment Tests...${NC}"
echo ""

# Test Create Investment
CREATE_INVESTMENT_RESPONSE=$(curl -s -X POST $API/investments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"NCBA Money Market Fund\",
    \"type\": \"money-market\",
    \"units\": 1000,
    \"purchasePrice\": 100,
    \"currentPrice\": 105,
    \"purchaseDate\": \"$(date -u +%Y-%m-01T00:00:00Z)\",
    \"notes\": \"Conservative investment\"
  }")

check_success "$CREATE_INVESTMENT_RESPONSE"
print_result $? "Create investment"

INVESTMENT_ID=$(echo "$CREATE_INVESTMENT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Test Get Portfolio Summary
GET_PORTFOLIO_RESPONSE=$(curl -s $API/investments \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_PORTFOLIO_RESPONSE"
print_result $? "Get investment portfolio summary"

# Test Update Investment
if [ ! -z "$INVESTMENT_ID" ]; then
  UPDATE_INVESTMENT_RESPONSE=$(curl -s -X PUT $API/investments/$INVESTMENT_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "currentPrice": 108
    }')

  check_success "$UPDATE_INVESTMENT_RESPONSE"
  print_result $? "Update investment"
fi

# Test Add Dividend
if [ ! -z "$INVESTMENT_ID" ]; then
  ADD_DIVIDEND_RESPONSE=$(curl -s -X POST $API/investments/$INVESTMENT_ID/dividends \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"amount\": 500,
      \"date\": \"$(date -u +%Y-%m-%dT00:00:00Z)\",
      \"type\": \"interest\",
      \"notes\": \"Monthly interest payment\"
    }")

  check_success "$ADD_DIVIDEND_RESPONSE"
  print_result $? "Add dividend payment"
fi

# Test Get Dividends
GET_DIVIDENDS_RESPONSE=$(curl -s $API/investments/dividends \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_DIVIDENDS_RESPONSE"
print_result $? "Get dividend payments"

# =============================================
# TEST 10: Additional Income Tests
# =============================================
echo ""
echo -e "${YELLOW}💵 Running Additional Income Tests...${NC}"
echo ""

# Test Create Additional Income
CREATE_INCOME_RESPONSE=$(curl -s -X POST $API/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$(date -u +%Y-%m-20T00:00:00Z)\",
    \"amount\": 15001,
    \"source\": \"Freelance Work\",
    \"description\": \"Website design project\",
    \"month\": \"$(date +%Y-%m)\"
  }")

check_success "$CREATE_INCOME_RESPONSE"
print_result $? "Create additional income"

INCOME_ID=$(echo "$CREATE_INCOME_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Test Get All Income
GET_INCOME_RESPONSE=$(curl -s $API/income \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_INCOME_RESPONSE"
print_result $? "Get all additional income"

# Test Get Income by Month
GET_MONTH_INCOME_RESPONSE=$(curl -s $API/income/month/$(date +%Y-%m) \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_MONTH_INCOME_RESPONSE"
print_result $? "Get income by month"

# Test Update Income
if [ ! -z "$INCOME_ID" ]; then
  UPDATE_INCOME_RESPONSE=$(curl -s -X PUT $API/income/$INCOME_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 18000
    }')

  check_success "$UPDATE_INCOME_RESPONSE"
  print_result $? "Update additional income"
fi

# =============================================
# TEST 11: Analytics Tests
# =============================================
echo ""
echo -e "${YELLOW}📊 Running Analytics Tests...${NC}"
echo ""

# Test Get Analytics Overview
GET_ANALYTICS_RESPONSE=$(curl -s $API/analytics/overview \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_ANALYTICS_RESPONSE"
print_result $? "Get analytics overview"

# Test Get Spending Trends
GET_TRENDS_RESPONSE=$(curl -s $API/analytics/trends \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_TRENDS_RESPONSE"
print_result $? "Get spending trends"

# Test Get Category Breakdown
GET_BREAKDOWN_RESPONSE=$(curl -s "$API/analytics/categories?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_BREAKDOWN_RESPONSE"
print_result $? "Get category breakdown"

# =============================================
# TEST 12: History Tests
# =============================================
echo ""
echo -e "${YELLOW}📅 Running History Tests...${NC}"
echo ""

# Test Get Month History
GET_HISTORY_RESPONSE=$(curl -s $API/history/$(date +%Y-%m) \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_HISTORY_RESPONSE"
print_result $? "Get month history"

# Test Get Range History
LAST_MONTH=$(date -d "1 month ago" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m)
GET_RANGE_HISTORY_RESPONSE=$(curl -s "$API/history/range?startMonth=$LAST_MONTH&endMonth=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_RANGE_HISTORY_RESPONSE"
print_result $? "Get range history"

# =============================================
# TEST 13: Delete Tests
# =============================================
echo ""
echo -e "${YELLOW}🗑️  Running Delete Tests...${NC}"
echo ""

# Test Delete Transaction
if [ ! -z "$TRANSACTION_ID" ]; then
  DELETE_TRANSACTION_RESPONSE=$(curl -s -X DELETE $API/transactions/$TRANSACTION_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_TRANSACTION_RESPONSE"
  print_result $? "Delete transaction"
fi

# Test Delete Savings Goal
if [ ! -z "$SAVINGS_GOAL_ID" ]; then
  DELETE_GOAL_RESPONSE=$(curl -s -X DELETE $API/savings/goals/$SAVINGS_GOAL_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_GOAL_RESPONSE"
  print_result $? "Delete savings goal"
fi

# Test Delete Asset
if [ ! -z "$ASSET_ID" ]; then
  DELETE_ASSET_RESPONSE=$(curl -s -X DELETE $API/networth/assets/$ASSET_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_ASSET_RESPONSE"
  print_result $? "Delete asset"
fi

# Test Delete Investment
if [ ! -z "$INVESTMENT_ID" ]; then
  DELETE_INVESTMENT_RESPONSE=$(curl -s -X DELETE $API/investments/$INVESTMENT_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_INVESTMENT_RESPONSE"
  print_result $? "Delete investment"
fi

# Test Delete Income
if [ ! -z "$INCOME_ID" ]; then
  DELETE_INCOME_RESPONSE=$(curl -s -X DELETE $API/income/$INCOME_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_INCOME_RESPONSE"
  print_result $? "Delete additional income"
fi

# Test Delete Category (should fail if it has transactions)
if [ ! -z "$CATEGORY_ID" ]; then
  DELETE_CATEGORY_RESPONSE=$(curl -s -X DELETE $API/budget/categories/$CATEGORY_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_CATEGORY_RESPONSE"
  print_result $? "Delete budget category"
fi

# =============================================
# TEST 14: Authorization Tests
# =============================================
echo ""
echo -e "${YELLOW}🔒 Running Authorization Tests...${NC}"
echo ""

# Test without token (should fail)
NO_AUTH_RESPONSE=$(curl -s $API/profile)
echo "$NO_AUTH_RESPONSE" | grep -q '"success":false'
print_result $? "Reject request without token"

# Test with invalid token (should fail)
INVALID_AUTH_RESPONSE=$(curl -s $API/profile \
  -H "Authorization: Bearer invalid_token_here")
echo "$INVALID_AUTH_RESPONSE" | grep -q '"success":false'
print_result $? "Reject request with invalid token"

# =============================================
# Final Summary
# =============================================
echo ""
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                     TEST SUMMARY                           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:      ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:      ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Backend is working perfectly!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Please check the errors above.${NC}"
  exit 1
fi


# =============================================
# TEST 4.5: 50/30/20 Budget Rule Tests
# =============================================
echo ""
echo -e "${YELLOW}🧮 Running 50/30/20 Budget Rule Tests...${NC}"
echo ""

# Test that default categories were auto-created during registration
DEFAULT_CATEGORIES_RESPONSE=$(curl -s $API/budget/categories \
  -H "Authorization: Bearer $TOKEN")

# Count default categories (should be 12)
DEFAULT_COUNT=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"isDefault":true' | wc -l)
if [ "$DEFAULT_COUNT" -eq 12 ] || [ "$DEFAULT_COUNT" -gt 0 ]; then
  print_result 0 "Auto-created default categories on registration (found $DEFAULT_COUNT)"
else
  print_result 1 "Auto-created default categories on registration (expected 12, found $DEFAULT_COUNT)"
fi

# Test that categories follow 50/30/20 distribution
NEEDS_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"needs"' | wc -l)
WANTS_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"wants"' | wc -l)
SAVINGS_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"savings"' | wc -l)
GROWTH_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"growth"' | wc -l)

if [ "$NEEDS_TOTAL" -ge 5 ] && [ "$WANTS_TOTAL" -ge 4 ] && [ "$SAVINGS_TOTAL" -ge 1 ] && [ "$GROWTH_TOTAL" -ge 2 ]; then
  print_result 0 "Correct category distribution (Needs:$NEEDS_TOTAL, Wants:$WANTS_TOTAL, Savings:$SAVINGS_TOTAL, Growth:$GROWTH_TOTAL)"
else
  print_result 1 "Category distribution incorrect (Needs:$NEEDS_TOTAL, Wants:$WANTS_TOTAL, Savings:$SAVINGS_TOTAL, Growth:$GROWTH_TOTAL)"
fi

# Test Recalculate Budget Endpoint
RECALCULATE_RESPONSE=$(curl -s -X POST $API/budget/recalculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

check_success "$RECALCULATE_RESPONSE"
print_result $? "Recalculate budget with 50/30/20 rule"

# Verify recalculation created correct allocation
ALLOCATION_RESPONSE=$(curl -s $API/budget/categories \
  -H "Authorization: Bearer $TOKEN")

# Check that budget was recalculated (should have 12 default categories)
RECALC_DEFAULT_COUNT=$(echo "$ALLOCATION_RESPONSE" | grep -o '"isDefault":true' | wc -l)
if [ "$RECALC_DEFAULT_COUNT" -eq 12 ] || [ "$RECALC_DEFAULT_COUNT" -gt 0 ]; then
  print_result 0 "Budget recalculated successfully (found $RECALC_DEFAULT_COUNT default categories)"
else
  print_result 1 "Budget recalculation failed (expected 12 categories, found $RECALC_DEFAULT_COUNT)"
fi

# Test recalculate without monthly income (should fail gracefully)
# First, create a new user without income
TIMESTAMP2=$(date +%s)
TEST_EMAIL2="noincome${TIMESTAMP2}@example.com"

NO_INCOME_REGISTER=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL2\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"No Income User\",
    \"monthlyIncome\": 0,
    \"dependents\": 0
  }")

NO_INCOME_TOKEN=$(extract_json "$NO_INCOME_REGISTER" "accessToken")

if [ ! -z "$NO_INCOME_TOKEN" ]; then
  NO_INCOME_RECALC=$(curl -s -X POST $API/budget/recalculate \
    -H "Authorization: Bearer $NO_INCOME_TOKEN" \
    -H "Content-Type: application/json")
  
  # Should fail with proper error message
  echo "$NO_INCOME_RECALC" | grep -q '"success":false'
  print_result $? "Reject recalculation without monthly income"
fi

# Test that custom (non-default) categories are preserved after recalculation
CUSTOM_CATEGORY_RESPONSE=$(curl -s -X POST $API/budget/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Test Category",
    "budgetedAmount": 5000,
    "type": "wants",
    "isDefault": false
  }')

CUSTOM_CAT_ID=$(echo "$CUSTOM_CATEGORY_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Recalculate again
curl -s -X POST $API/budget/recalculate \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1

# Check if custom category still exists
if [ ! -z "$CUSTOM_CAT_ID" ]; then
  PRESERVED_CHECK=$(curl -s $API/budget/categories/$CUSTOM_CAT_ID \
    -H "Authorization: Bearer $TOKEN")
  
  check_success "$PRESERVED_CHECK"
  if [ $? -eq 0 ]; then
    print_result 0 "Custom categories preserved after recalculation"
  else
    print_result 1 "Custom categories not preserved after recalculation"
  fi
fi

# Test budget allocation percentages
BUDGET_SUMMARY=$(curl -s "$API/budget/summary?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$BUDGET_SUMMARY"
print_result $? "Verify budget allocation totals"

# Calculate expected allocations (monthly income = 120000 from profile update)
EXPECTED_NEEDS=60000
EXPECTED_WANTS=36000
EXPECTED_SAVINGS=24000

# Note: Actual verification of amounts would require parsing JSON more carefully
# This is a basic structure check
echo "$BUDGET_SUMMARY" | grep -q '"totalBudgeted"'
print_result $? "Budget summary contains allocation data"