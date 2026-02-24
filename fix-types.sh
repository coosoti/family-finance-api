#!/bin/bash

# Fix budget.controller.ts
sed -i '' 's/req.params.id/req.params.id as string/g' src/controllers/v1/budget.controller.ts

# Fix history.controller.ts
sed -i '' 's/const { month } = req.params;/const month = req.params.month as string;/g' src/controllers/v1/history.controller.ts

# Fix income.controller.ts
sed -i '' 's/const { month } = req.params;/const month = req.params.month as string;/g' src/controllers/v1/income.controller.ts
sed -i '' 's/req.params.id/req.params.id as string/g' src/controllers/v1/income.controller.ts

# Fix investments.controller.ts
sed -i '' 's/req.params.id/req.params.id as string/g' src/controllers/v1/investments.controller.ts

# Fix networth.controller.ts
sed -i '' 's/req.params.id/req.params.id as string/g' src/controllers/v1/networth.controller.ts

# Fix savings.controller.ts
sed -i '' 's/req.params.id/req.params.id as string/g' src/controllers/v1/savings.controller.ts

echo "✅ All type fixes applied!"