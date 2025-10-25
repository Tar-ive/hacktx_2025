# Nessie Data Fetcher

Use `fetch_customer_data.mjs` to pull a single customer's Nessie sandbox data (customer, accounts, bills, deposits, purchases) into a JSON file.

## Prerequisites
- Node.js 18+
- Nessie API key available as `NESSIE_API_KEY` (or pass `API_KEY`)

## Usage
```
NESSIE_API_KEY=YOUR_KEY \
node scripts/fetch_customer_data.mjs \
  --customer-id=CUSTOMER_ID \
  --output=customer_data.json \
  [--create-sample] \
  [--merchant-id=MERCHANT_ID]
```

If you omit `--customer-id`, the script uses the first customer returned by `/customers`. Add `--create-sample` to seed that customer with a fresh checking account, bill, deposit, and purchase before exporting.
