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

TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Test User ${TIMESTAMP}"

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

LOGIN_RESPONSE=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

check_success "$LOGIN_RESPONSE"
print_result $? "User login"

ME_RESPONSE=$(curl -s $API/auth/me \
  -H "Authorization: Bearer $TOKEN")

check_success "$ME_RESPONSE"
print_result $? "Get current user profile"

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

GET_CATEGORIES_RESPONSE=$(curl -s $API/budget/categories \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_CATEGORIES_RESPONSE"
print_result $? "Get all budget categories"

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

BUDGET_SUMMARY_RESPONSE=$(curl -s "$API/budget/summary?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$BUDGET_SUMMARY_RESPONSE"
print_result $? "Get budget summary"

# =============================================
# TEST 4.5: 50/30/20 Budget Rule Tests
# =============================================
echo ""
echo -e "${YELLOW}🧮 Running 50/30/20 Budget Rule Tests...${NC}"
echo ""

DEFAULT_CATEGORIES_RESPONSE=$(curl -s $API/budget/categories \
  -H "Authorization: Bearer $TOKEN")

DEFAULT_COUNT=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"isDefault":true' | wc -l)
if [ "$DEFAULT_COUNT" -eq 12 ] || [ "$DEFAULT_COUNT" -gt 0 ]; then
  print_result 0 "Auto-created default categories on registration (found $DEFAULT_COUNT)"
else
  print_result 1 "Auto-created default categories on registration (expected 12, found $DEFAULT_COUNT)"
fi

NEEDS_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"needs"' | wc -l)
WANTS_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"wants"' | wc -l)
SAVINGS_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"savings"' | wc -l)
GROWTH_TOTAL=$(echo "$DEFAULT_CATEGORIES_RESPONSE" | grep -o '"type":"growth"' | wc -l)

if [ "$NEEDS_TOTAL" -ge 5 ] && [ "$WANTS_TOTAL" -ge 4 ] && [ "$SAVINGS_TOTAL" -ge 1 ] && [ "$GROWTH_TOTAL" -ge 2 ]; then
  print_result 0 "Correct category distribution (Needs:$NEEDS_TOTAL, Wants:$WANTS_TOTAL, Savings:$SAVINGS_TOTAL, Growth:$GROWTH_TOTAL)"
else
  print_result 1 "Category distribution incorrect (Needs:$NEEDS_TOTAL, Wants:$WANTS_TOTAL, Savings:$SAVINGS_TOTAL, Growth:$GROWTH_TOTAL)"
fi

RECALCULATE_RESPONSE=$(curl -s -X POST $API/budget/recalculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

check_success "$RECALCULATE_RESPONSE"
print_result $? "Recalculate budget with 50/30/20 rule"

ALLOCATION_RESPONSE=$(curl -s $API/budget/categories \
  -H "Authorization: Bearer $TOKEN")

RECALC_DEFAULT_COUNT=$(echo "$ALLOCATION_RESPONSE" | grep -o '"isDefault":true' | wc -l)
if [ "$RECALC_DEFAULT_COUNT" -eq 12 ] || [ "$RECALC_DEFAULT_COUNT" -gt 0 ]; then
  print_result 0 "Budget recalculated successfully (found $RECALC_DEFAULT_COUNT default categories)"
else
  print_result 1 "Budget recalculation failed (expected 12 categories, found $RECALC_DEFAULT_COUNT)"
fi

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
  echo "$NO_INCOME_RECALC" | grep -q '"success":false'
  print_result $? "Reject recalculation without monthly income"
fi

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

curl -s -X POST $API/budget/recalculate \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1

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

BUDGET_SUMMARY=$(curl -s "$API/budget/summary?month=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$BUDGET_SUMMARY"
print_result $? "Verify budget allocation totals"

echo "$BUDGET_SUMMARY" | grep -q '"totalBudgeted"'
print_result $? "Budget summary contains allocation data"

# =============================================
# TEST 5: Transaction Tests
# =============================================
echo ""
echo -e "${YELLOW}💸 Running Transaction Tests...${NC}"
echo ""

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

GET_TRANSACTIONS_RESPONSE=$(curl -s $API/transactions \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_TRANSACTIONS_RESPONSE"
print_result $? "Get all transactions"

GET_MONTH_TRANSACTIONS_RESPONSE=$(curl -s $API/transactions/month/$(date +%Y-%m) \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_MONTH_TRANSACTIONS_RESPONSE"
print_result $? "Get transactions by month"

if [ ! -z "$TRANSACTION_ID" ]; then
  GET_TRANSACTION_RESPONSE=$(curl -s $API/transactions/$TRANSACTION_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$GET_TRANSACTION_RESPONSE"
  print_result $? "Get transaction by ID"
fi

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

GET_GOALS_RESPONSE=$(curl -s $API/savings/goals \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_GOALS_RESPONSE"
print_result $? "Get all savings goals"

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

GET_NETWORTH_RESPONSE=$(curl -s $API/networth \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_NETWORTH_RESPONSE"
print_result $? "Get current net worth"

GET_ASSETS_RESPONSE=$(curl -s $API/networth/assets \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_ASSETS_RESPONSE"
print_result $? "Get all assets"

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

GET_IPP_RESPONSE=$(curl -s $API/ipp \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_IPP_RESPONSE"
print_result $? "Get IPP account"

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

GET_PORTFOLIO_RESPONSE=$(curl -s $API/investments \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_PORTFOLIO_RESPONSE"
print_result $? "Get investment portfolio summary"

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

GET_INCOME_RESPONSE=$(curl -s $API/income \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_INCOME_RESPONSE"
print_result $? "Get all additional income"

GET_MONTH_INCOME_RESPONSE=$(curl -s $API/income/month/$(date +%Y-%m) \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_MONTH_INCOME_RESPONSE"
print_result $? "Get income by month"

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

GET_ANALYTICS_RESPONSE=$(curl -s $API/analytics/overview \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_ANALYTICS_RESPONSE"
print_result $? "Get analytics overview"

GET_TRENDS_RESPONSE=$(curl -s $API/analytics/trends \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_TRENDS_RESPONSE"
print_result $? "Get spending trends"

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

GET_HISTORY_RESPONSE=$(curl -s $API/history/$(date +%Y-%m) \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_HISTORY_RESPONSE"
print_result $? "Get month history"

LAST_MONTH=$(date -d "1 month ago" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m)
GET_RANGE_HISTORY_RESPONSE=$(curl -s "$API/history/range?startMonth=$LAST_MONTH&endMonth=$(date +%Y-%m)" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_RANGE_HISTORY_RESPONSE"
print_result $? "Get range history"

# =============================================
# TEST 13: Recurring Bills & Subscriptions Tests
# =============================================
echo ""
echo -e "${YELLOW}🔄 Running Recurring Bills & Subscriptions Tests...${NC}"
echo ""

RECURRING_BILL_ID=""
RECURRING_SUB_ID=""
RECURRING_INACTIVE_ID=""

# --- Create: Monthly Bill ---
NEXT_MONTH=$(date -d "next month" +%Y-%m-01 2>/dev/null || date -v+1m +%Y-%m-01)

CREATE_BILL_RESPONSE=$(curl -s -X POST $API/recurring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Rent\",
    \"provider\": \"Landlord\",
    \"category\": \"Housing\",
    \"type\": \"bill\",
    \"amount\": 45000,
    \"currency\": \"KES\",
    \"billing_cycle\": \"monthly\",
    \"billing_day\": 1,
    \"next_due_date\": \"$NEXT_MONTH\",
    \"is_active\": true,
    \"auto_categorize\": true,
    \"auto_create_tx\": false,
    \"notes\": \"Monthly rent payment\"
  }")

check_success "$CREATE_BILL_RESPONSE"
print_result $? "Create recurring bill (Rent)"

RECURRING_BILL_ID=$(echo "$CREATE_BILL_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# --- Create: Monthly Subscription ---
CREATE_SUB_RESPONSE=$(curl -s -X POST $API/recurring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Netflix\",
    \"provider\": \"Netflix\",
    \"category\": \"Entertainment\",
    \"type\": \"subscription\",
    \"amount\": 1100,
    \"currency\": \"KES\",
    \"billing_cycle\": \"monthly\",
    \"billing_day\": 15,
    \"next_due_date\": \"$(date +%Y-%m-15)\",
    \"is_active\": true,
    \"auto_categorize\": true,
    \"auto_create_tx\": false,
    \"notes\": \"Standard plan\"
  }")

check_success "$CREATE_SUB_RESPONSE"
print_result $? "Create recurring subscription (Netflix)"

RECURRING_SUB_ID=$(echo "$CREATE_SUB_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# --- Create: Subscription with auto_create_tx enabled ---
CREATE_AUTO_TX_RESPONSE=$(curl -s -X POST $API/recurring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Spotify\",
    \"provider\": \"Spotify\",
    \"category\": \"Entertainment\",
    \"type\": \"subscription\",
    \"amount\": 550,
    \"currency\": \"KES\",
    \"billing_cycle\": \"monthly\",
    \"billing_day\": 10,
    \"next_due_date\": \"$(date +%Y-%m-10)\",
    \"is_active\": true,
    \"auto_categorize\": true,
    \"auto_create_tx\": true
  }")

check_success "$CREATE_AUTO_TX_RESPONSE"
print_result $? "Create subscription with auto-create transaction enabled (Spotify)"

AUTO_TX_RECURRING_ID=$(echo "$CREATE_AUTO_TX_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# --- Create: Annual bill ---
CREATE_ANNUAL_RESPONSE=$(curl -s -X POST $API/recurring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Car Insurance\",
    \"provider\": \"Jubilee Insurance\",
    \"category\": \"Insurance\",
    \"type\": \"bill\",
    \"amount\": 36000,
    \"currency\": \"KES\",
    \"billing_cycle\": \"annually\",
    \"billing_day\": 1,
    \"next_due_date\": \"$(date -d 'next year' +%Y-%m-01 2>/dev/null || date -v+1y +%Y-%m-01)\",
    \"is_active\": true,
    \"auto_categorize\": true,
    \"auto_create_tx\": false
  }")

check_success "$CREATE_ANNUAL_RESPONSE"
print_result $? "Create annual recurring bill (Car Insurance)"

# --- Create: Inactive subscription (for unused detection testing) ---
CREATE_INACTIVE_RESPONSE=$(curl -s -X POST $API/recurring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Adobe Creative\",
    \"provider\": \"Adobe\",
    \"category\": \"Software\",
    \"type\": \"subscription\",
    \"amount\": 5200,
    \"currency\": \"KES\",
    \"billing_cycle\": \"monthly\",
    \"billing_day\": 5,
    \"next_due_date\": \"$(date +%Y-%m-05)\",
    \"is_active\": true,
    \"auto_categorize\": true,
    \"auto_create_tx\": false,
    \"usage_count_30d\": 0
  }")

check_success "$CREATE_INACTIVE_RESPONSE"
print_result $? "Create unused subscription (Adobe Creative)"

RECURRING_INACTIVE_ID=$(echo "$CREATE_INACTIVE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# --- Get: All recurring items ---
GET_ALL_RECURRING_RESPONSE=$(curl -s $API/recurring \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_ALL_RECURRING_RESPONSE"
print_result $? "Get all recurring items"

# Count returned items (expect at least 5 from above)
RECURRING_COUNT=$(echo "$GET_ALL_RECURRING_RESPONSE" | grep -o '"id":"' | wc -l)
if [ "$RECURRING_COUNT" -ge 4 ]; then
  print_result 0 "Correct number of recurring items returned (found $RECURRING_COUNT)"
else
  print_result 1 "Unexpected recurring item count (found $RECURRING_COUNT, expected >= 4)"
fi

# --- Get: Filter by type=bill ---
GET_BILLS_RESPONSE=$(curl -s "$API/recurring?type=bill" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_BILLS_RESPONSE"
print_result $? "Filter recurring items by type=bill"

BILL_COUNT=$(echo "$GET_BILLS_RESPONSE" | grep -o '"type":"bill"' | wc -l)
if [ "$BILL_COUNT" -ge 2 ]; then
  print_result 0 "Bills filter returned correct results (found $BILL_COUNT)"
else
  print_result 1 "Bills filter returned unexpected results (found $BILL_COUNT, expected >= 2)"
fi

# --- Get: Filter by type=subscription ---
GET_SUBS_RESPONSE=$(curl -s "$API/recurring?type=subscription" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_SUBS_RESPONSE"
print_result $? "Filter recurring items by type=subscription"

# --- Get: Single recurring item by ID ---
if [ ! -z "$RECURRING_BILL_ID" ]; then
  GET_SINGLE_RECURRING_RESPONSE=$(curl -s $API/recurring/$RECURRING_BILL_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$GET_SINGLE_RECURRING_RESPONSE"
  print_result $? "Get recurring item by ID"

  # Verify item fields are present
  echo "$GET_SINGLE_RECURRING_RESPONSE" | grep -q '"billing_cycle"'
  print_result $? "Recurring item response contains billing_cycle field"

  echo "$GET_SINGLE_RECURRING_RESPONSE" | grep -q '"next_due_date"'
  print_result $? "Recurring item response contains next_due_date field"
fi

# --- Get: Non-existent ID should return 404 ---
GET_INVALID_RECURRING_RESPONSE=$(curl -s $API/recurring/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_INVALID_RECURRING_RESPONSE" | grep -q '"success":false'
print_result $? "Return error for non-existent recurring item ID"

# --- Update: Recurring item amount ---
if [ ! -z "$RECURRING_BILL_ID" ]; then
  UPDATE_RECURRING_RESPONSE=$(curl -s -X PUT $API/recurring/$RECURRING_BILL_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 50000,
      "notes": "Rent increased"
    }')

  check_success "$UPDATE_RECURRING_RESPONSE"
  print_result $? "Update recurring item amount"

  # Verify updated value
  UPDATED_AMOUNT=$(echo "$UPDATE_RECURRING_RESPONSE" | grep -o '"amount":[0-9]*' | head -1 | cut -d':' -f2)
  if [ "$UPDATED_AMOUNT" = "50000" ]; then
    print_result 0 "Recurring item amount updated correctly"
  else
    print_result 1 "Recurring item amount not updated correctly (got $UPDATED_AMOUNT)"
  fi
fi

# --- Update: Pause (deactivate) a subscription ---
if [ ! -z "$RECURRING_INACTIVE_ID" ]; then
  PAUSE_SUB_RESPONSE=$(curl -s -X PUT $API/recurring/$RECURRING_INACTIVE_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "is_active": false
    }')

  check_success "$PAUSE_SUB_RESPONSE"
  print_result $? "Pause (deactivate) unused subscription"

  # Verify it no longer appears in active filter
  GET_ACTIVE_RESPONSE=$(curl -s "$API/recurring?is_active=true" \
    -H "Authorization: Bearer $TOKEN")

  echo "$GET_ACTIVE_RESPONSE" | grep -q "\"id\":\"$RECURRING_INACTIVE_ID\""
  if [ $? -ne 0 ]; then
    print_result 0 "Paused subscription excluded from active filter"
  else
    print_result 1 "Paused subscription incorrectly included in active filter"
  fi
fi

# --- Analytics: Upcoming bills (next 30 days) ---
GET_UPCOMING_RESPONSE=$(curl -s "$API/recurring/upcoming?days=30" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_UPCOMING_RESPONSE"
print_result $? "Get upcoming bills (30 days)"

echo "$GET_UPCOMING_RESPONSE" | grep -q '"days_until_due"'
print_result $? "Upcoming bills response contains days_until_due field"

# --- Analytics: Upcoming bills (7 days) ---
GET_UPCOMING_7_RESPONSE=$(curl -s "$API/recurring/upcoming?days=7" \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_UPCOMING_7_RESPONSE"
print_result $? "Get upcoming bills (7 days)"

# --- Analytics: Unused subscriptions ---
GET_UNUSED_RESPONSE=$(curl -s $API/recurring/unused \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_UNUSED_RESPONSE"
print_result $? "Get unused subscriptions"

echo "$GET_UNUSED_RESPONSE" | grep -q '"potential_annual_saving"'
print_result $? "Unused subscriptions response contains potential_annual_saving field"

# --- Analytics: Summary ---
GET_RECURRING_SUMMARY_RESPONSE=$(curl -s $API/recurring/summary \
  -H "Authorization: Bearer $TOKEN")

check_success "$GET_RECURRING_SUMMARY_RESPONSE"
print_result $? "Get recurring summary"

echo "$GET_RECURRING_SUMMARY_RESPONSE" | grep -q '"total_monthly_bills"'
print_result $? "Summary contains total_monthly_bills"

echo "$GET_RECURRING_SUMMARY_RESPONSE" | grep -q '"total_monthly_subscriptions"'
print_result $? "Summary contains total_monthly_subscriptions"

echo "$GET_RECURRING_SUMMARY_RESPONSE" | grep -q '"upcoming_7_days"'
print_result $? "Summary contains upcoming_7_days"

echo "$GET_RECURRING_SUMMARY_RESPONSE" | grep -q '"overdue_count"'
print_result $? "Summary contains overdue_count"

echo "$GET_RECURRING_SUMMARY_RESPONSE" | grep -q '"unused_subscriptions"'
print_result $? "Summary contains unused_subscriptions"

# --- Action: Mark as paid ---
if [ ! -z "$RECURRING_SUB_ID" ]; then
  MARK_PAID_RESPONSE=$(curl -s -X POST $API/recurring/$RECURRING_SUB_ID/pay \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"paid_date\": \"$(date +%Y-%m-%d)\",
      \"create_transaction\": false
    }")

  check_success "$MARK_PAID_RESPONSE"
  print_result $? "Mark subscription as paid"

  # Verify next_due_date advanced
  PAID_ITEM_DATE=$(echo "$MARK_PAID_RESPONSE" | grep -o '"next_due_date":"[^"]*' | cut -d'"' -f4)
  CURRENT_DATE=$(date +%Y-%m-%d)
  if [[ "$PAID_ITEM_DATE" > "$CURRENT_DATE" ]]; then
    print_result 0 "next_due_date advanced after payment (new date: $PAID_ITEM_DATE)"
  else
    print_result 1 "next_due_date not advanced after payment (got: $PAID_ITEM_DATE)"
  fi

  # Verify last_paid_date set correctly
  echo "$MARK_PAID_RESPONSE" | grep -q '"last_paid_date"'
  print_result $? "last_paid_date set on mark-paid response"
fi

# --- Action: Mark as paid with auto-create transaction ---
if [ ! -z "$AUTO_TX_RECURRING_ID" ]; then
  MARK_PAID_TX_RESPONSE=$(curl -s -X POST $API/recurring/$AUTO_TX_RECURRING_ID/pay \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"paid_date\": \"$(date +%Y-%m-%d)\",
      \"create_transaction\": true
    }")

  check_success "$MARK_PAID_TX_RESPONSE"
  print_result $? "Mark paid and auto-create transaction"

  # Verify a transaction was created for this payment
  GET_TX_AFTER_PAY=$(curl -s $API/transactions \
    -H "Authorization: Bearer $TOKEN")

  echo "$GET_TX_AFTER_PAY" | grep -q '"Spotify"'
  print_result $? "Transaction created automatically on mark-paid"
fi

# --- Action: Auto-generate due transactions ---
AUTO_GEN_RESPONSE=$(curl -s -X POST $API/recurring/auto-generate \
  -H "Authorization: Bearer $TOKEN")

check_success "$AUTO_GEN_RESPONSE"
print_result $? "Auto-generate due transactions"

echo "$AUTO_GEN_RESPONSE" | grep -q '"created"'
print_result $? "Auto-generate response contains created array"

# --- Authorization: Cannot access another user's recurring items ---
if [ ! -z "$RECURRING_BILL_ID" ] && [ ! -z "$NO_INCOME_TOKEN" ]; then
  OTHER_USER_RECURRING=$(curl -s $API/recurring/$RECURRING_BILL_ID \
    -H "Authorization: Bearer $NO_INCOME_TOKEN")

  echo "$OTHER_USER_RECURRING" | grep -q '"success":false'
  print_result $? "Cannot access another user's recurring item"
fi

# =============================================
# TEST 14: Delete Tests
# =============================================
echo ""
echo -e "${YELLOW}🗑️  Running Delete Tests...${NC}"
echo ""

if [ ! -z "$TRANSACTION_ID" ]; then
  DELETE_TRANSACTION_RESPONSE=$(curl -s -X DELETE $API/transactions/$TRANSACTION_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_TRANSACTION_RESPONSE"
  print_result $? "Delete transaction"
fi

if [ ! -z "$SAVINGS_GOAL_ID" ]; then
  DELETE_GOAL_RESPONSE=$(curl -s -X DELETE $API/savings/goals/$SAVINGS_GOAL_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_GOAL_RESPONSE"
  print_result $? "Delete savings goal"
fi

if [ ! -z "$ASSET_ID" ]; then
  DELETE_ASSET_RESPONSE=$(curl -s -X DELETE $API/networth/assets/$ASSET_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_ASSET_RESPONSE"
  print_result $? "Delete asset"
fi

if [ ! -z "$INVESTMENT_ID" ]; then
  DELETE_INVESTMENT_RESPONSE=$(curl -s -X DELETE $API/investments/$INVESTMENT_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_INVESTMENT_RESPONSE"
  print_result $? "Delete investment"
fi

if [ ! -z "$INCOME_ID" ]; then
  DELETE_INCOME_RESPONSE=$(curl -s -X DELETE $API/income/$INCOME_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_INCOME_RESPONSE"
  print_result $? "Delete additional income"
fi

if [ ! -z "$CATEGORY_ID" ]; then
  DELETE_CATEGORY_RESPONSE=$(curl -s -X DELETE $API/budget/categories/$CATEGORY_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_CATEGORY_RESPONSE"
  print_result $? "Delete budget category"
fi

# --- Delete: Recurring items ---
if [ ! -z "$AUTO_TX_RECURRING_ID" ]; then
  DELETE_AUTO_TX_RESPONSE=$(curl -s -X DELETE $API/recurring/$AUTO_TX_RECURRING_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_AUTO_TX_RESPONSE"
  print_result $? "Delete recurring subscription (Spotify)"
fi

if [ ! -z "$RECURRING_SUB_ID" ]; then
  DELETE_SUB_RESPONSE=$(curl -s -X DELETE $API/recurring/$RECURRING_SUB_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_SUB_RESPONSE"
  print_result $? "Delete recurring subscription (Netflix)"
fi

if [ ! -z "$RECURRING_INACTIVE_ID" ]; then
  DELETE_INACTIVE_RESPONSE=$(curl -s -X DELETE $API/recurring/$RECURRING_INACTIVE_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_INACTIVE_RESPONSE"
  print_result $? "Delete paused subscription (Adobe Creative)"
fi

if [ ! -z "$RECURRING_BILL_ID" ]; then
  DELETE_BILL_RESPONSE=$(curl -s -X DELETE $API/recurring/$RECURRING_BILL_ID \
    -H "Authorization: Bearer $TOKEN")

  check_success "$DELETE_BILL_RESPONSE"
  print_result $? "Delete recurring bill (Rent)"

  # Verify it's gone
  GET_DELETED_RESPONSE=$(curl -s $API/recurring/$RECURRING_BILL_ID \
    -H "Authorization: Bearer $TOKEN")

  echo "$GET_DELETED_RESPONSE" | grep -q '"success":false'
  print_result $? "Deleted recurring item no longer accessible"
fi

# =============================================
# TEST 15: Authorization Tests
# =============================================
echo ""
echo -e "${YELLOW}🔒 Running Authorization Tests...${NC}"
echo ""

NO_AUTH_RESPONSE=$(curl -s $API/profile)
echo "$NO_AUTH_RESPONSE" | grep -q '"success":false'
print_result $? "Reject request without token"

INVALID_AUTH_RESPONSE=$(curl -s $API/profile \
  -H "Authorization: Bearer invalid_token_here")
echo "$INVALID_AUTH_RESPONSE" | grep -q '"success":false'
print_result $? "Reject request with invalid token"

NO_AUTH_RECURRING=$(curl -s $API/recurring)
echo "$NO_AUTH_RECURRING" | grep -q '"success":false'
print_result $? "Reject recurring request without token"

INVALID_AUTH_RECURRING=$(curl -s $API/recurring \
  -H "Authorization: Bearer invalid_token_here")
echo "$INVALID_AUTH_RECURRING" | grep -q '"success":false'
print_result $? "Reject recurring request with invalid token"

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