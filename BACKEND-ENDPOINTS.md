# Family Finance API - Endpoint Reference

Base URL: `http://localhost:5000/api/v1`

## Authentication Endpoints

### POST /auth/register
Register new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "monthlyIncome": 100000,
  "dependents": 2
}
```

### POST /auth/login
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /auth/google
Google OAuth
```json
{
  "idToken": "google_id_token"
}
```

### POST /auth/refresh
Refresh access token
```json
{
  "refreshToken": "refresh_token"
}
```

### GET /auth/me
Get current user (requires auth)

### POST /auth/forgot-password
Send password reset email
```json
{
  "email": "user@example.com"
}
```

## Profile Endpoints

### GET /profile
Get user profile (requires auth)

### PUT /profile
Update user profile (requires auth)
```json
{
  "name": "Updated Name",
  "monthlyIncome": 120000,
  "dependents": 3
}
```

## Budget Endpoints

### GET /budget/categories
Get all categories (requires auth)

### POST /budget/categories
Create category (requires auth)
```json
{
  "name": "Groceries",
  "budgetedAmount": 25000,
  "type": "needs"
}
```

### PUT /budget/categories/:id
Update category (requires auth)

### DELETE /budget/categories/:id
Delete category (requires auth)

### GET /budget/summary?month=YYYY-MM
Get budget summary for month (requires auth)

### GET /budget/summary/range?startMonth=YYYY-MM&endMonth=YYYY-MM
Get budget summary for range (requires auth)

## Transaction Endpoints

### GET /transactions
Get all transactions (requires auth)

### GET /transactions/month/:month
Get transactions by month (requires auth)

### GET /transactions/range?startMonth=YYYY-MM&endMonth=YYYY-MM
Get transactions by date range (requires auth)

### GET /transactions/:id
Get single transaction (requires auth)

### POST /transactions
Create transaction (requires auth)
```json
{
  "categoryId": "uuid",
  "date": "2026-02-25T10:00:00Z",
  "amount": 5000,
  "type": "expense",
  "notes": "Grocery shopping",
  "month": "2026-02"
}
```

### PUT /transactions/:id
Update transaction (requires auth)

### DELETE /transactions/:id
Delete transaction (requires auth)

## Savings Endpoints

### GET /savings/goals
Get all savings goals (requires auth)

### POST /savings/goals
Create savings goal (requires auth)
```json
{
  "name": "Emergency Fund",
  "targetAmount": 300000,
  "currentAmount": 50000,
  "monthlyContribution": 10000
}
```

### PUT /savings/goals/:id
Update savings goal (requires auth)

### DELETE /savings/goals/:id
Delete savings goal (requires auth)

### GET /savings/contributions?startMonth=YYYY-MM&endMonth=YYYY-MM
Get savings contributions (requires auth)

## Net Worth Endpoints

### GET /networth
Get current net worth (requires auth)

### GET /networth/assets
Get all assets (requires auth)

### POST /networth/assets
Create asset (requires auth)
```json
{
  "name": "Savings Account",
  "amount": 150000,
  "type": "asset",
  "category": "Cash & Bank Accounts"
}
```

### PUT /networth/assets/:id
Update asset (requires auth)

### DELETE /networth/assets/:id
Delete asset (requires auth)

### GET /networth/history?startMonth=YYYY-MM&endMonth=YYYY-MM
Get net worth history (requires auth)

## IPP Endpoints

### GET /ipp
Get IPP account (requires auth)

### PUT /ipp
Update IPP account (requires auth)
```json
{
  "currentBalance": 75000,
  "monthlyContribution": 5000,
  "totalContributions": 75000,
  "taxReliefRate": 0.3,
  "realizedValue": 97500
}
```

### GET /ipp/contributions?startMonth=YYYY-MM&endMonth=YYYY-MM
Get IPP contributions (requires auth)

## Investment Endpoints

### GET /investments
Get portfolio summary (requires auth)

### POST /investments
Create investment (requires auth)
```json
{
  "name": "NCBA Money Market",
  "type": "money-market",
  "units": 1000,
  "purchasePrice": 100,
  "currentPrice": 105,
  "purchaseDate": "2026-01-01T00:00:00Z",
  "notes": "Conservative"
}
```

### PUT /investments/:id
Update investment (requires auth)

### DELETE /investments/:id
Delete investment (requires auth)

### GET /investments/dividends?investmentId=uuid
Get dividends (requires auth)

### POST /investments/:id/dividends
Add dividend (requires auth)
```json
{
  "amount": 500,
  "date": "2026-02-25T00:00:00Z",
  "type": "interest",
  "notes": "Monthly interest"
}
```

## Income Endpoints

### GET /income?startMonth=YYYY-MM&endMonth=YYYY-MM
Get additional income (requires auth)

### GET /income/month/:month
Get income by month (requires auth)

### POST /income
Add additional income (requires auth)
```json
{
  "date": "2026-02-20T00:00:00Z",
  "amount": 15000,
  "source": "Freelance",
  "description": "Website project",
  "month": "2026-02"
}
```

### PUT /income/:id
Update income (requires auth)

### DELETE /income/:id
Delete income (requires auth)

## Analytics Endpoints

### GET /analytics/overview?startMonth=YYYY-MM&endMonth=YYYY-MM
Get analytics overview (requires auth)

### GET /analytics/trends?startMonth=YYYY-MM&endMonth=YYYY-MM
Get spending trends (requires auth)

### GET /analytics/categories?month=YYYY-MM
Get category breakdown (requires auth)

## History Endpoints

### GET /history/:month
Get full month history (requires auth)

### GET /history/range?startMonth=YYYY-MM&endMonth=YYYY-MM
Get range history (requires auth)

## WebSocket Events

Connect: `ws://localhost:5000`
Auth: Pass JWT token in handshake

Events:
- `user:connected` - User connected
- `transaction:created` - New transaction
- `transaction:updated` - Transaction updated
- `transaction:deleted` - Transaction deleted
