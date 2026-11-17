# Karcha Roz

A responsive personal finance app built with React, Vite, TypeScript, Tailwind CSS, Recharts, Express, Prisma and SQLite. It includes account authentication, transaction management, recurring transactions, receipts, budgets, reports, CSV/XLSX exports, CSV import preview, custom categories and savings goals.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Setup (Windows PowerShell)

From the project root:

```powershell
npm install
Copy-Item server\.env.example server\.env
npm run db:push
npm run db:seed
npm run dev
```

Open <http://localhost:5173>. The API health check is <http://localhost:4000/api/health>.

Before sharing or deploying the app, replace the placeholder `JWT_SECRET` in `server/.env` with a strong random secret. The SQLite database and uploaded receipts are stored under `server/`.

Demo account:

- Email: `demo@example.com`
- Password: `Budget123!`

The seed command creates a demo account with around three months of sample transactions, default categories, a monthly budget and a savings goal. It refreshes the demo account's sample records when run again.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run API and web client together |
| `npm run build` | Build server and client |
| `npm test` | Run backend API tests |
| `npm run db:push` | Create/update the SQLite schema and generate Prisma Client |
| `npm run db:seed` | Seed demo user and sample data |

## Features

- Email/password authentication with bcrypt and JWT; all data routes scope database access to the authenticated user.
- Expenses and income with AED default currency, categories, tags, payment method, date, optional receipt image and recurrence.
- Transactions can use AED, USD, EUR, GBP, INR, SAR, PKR, CAD, AUD or CNY.
- Transaction search, filters, sorting, pagination, CSV export, Excel export, and CSV import with column mapping and a validation preview.
- Monthly overall and category budgets with 80% and 100% warnings.
- Dashboard cards, category breakdown, cash-flow charts, recent activity and monthly/yearly reports.
- Savings goals with dated contributions.
- Responsive interface with persisted light/dark theme preference.

Money is stored as integer minor units (fils/cents). Currency values are not converted; totals and reports assume the transactions being compared use the same currency.

## API

- `/api/auth` — register, login, current user
- `/api/categories` — category CRUD
- `/api/transactions` — CRUD, filters, receipts, CSV/XLSX export and import preview/save
- `/api/budgets` — monthly budgets and progress status
- `/api/reports` — monthly/yearly summaries
- `/api/goals` — savings goals and contributions
