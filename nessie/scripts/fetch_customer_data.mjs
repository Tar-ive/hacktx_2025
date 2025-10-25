import { writeFile } from 'fs/promises';
import { argv, env, exit } from 'node:process';

const API_BASE = 'http://api.nessieisreal.com';
const API_KEY = env.NESSIE_API_KEY || env.API_KEY;

if (!API_KEY) {
  console.error('Missing Nessie API key. Set NESSIE_API_KEY or API_KEY.');
  exit(1);
}

const options = {
  customerId: env.NESSIE_CUSTOMER_ID || env.CUSTOMER_ID,
  output: env.OUTPUT_PATH || 'customer_data.json',
  createSample: false,
  merchantId: env.NESSIE_MERCHANT_ID || env.MERCHANT_ID
};

for (const arg of argv.slice(2)) {
  if (arg === '--create-sample') {
    options.createSample = true;
  } else if (arg.startsWith('--customer-id=')) {
    options.customerId = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    options.output = arg.split('=')[1];
  } else if (arg.startsWith('--merchant-id=')) {
    options.merchantId = arg.split('=')[1];
  }
}

async function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE);
  url.searchParams.set('key', API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

async function request(path, { method = 'GET', body, params, expected = [200] } = {}) {
  const url = await buildUrl(path, params);
  const headers = body ? { 'Content-Type': 'application/json' } : undefined;
  const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  if (!expected.includes(response.status)) {
    if (response.status === 404) {
      return null;
    }
    const text = await response.text();
    throw new Error(`Request to ${url} failed with ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Unable to parse JSON from ${url}: ${error.message}`);
  }
}

async function ensureCustomerId() {
  if (options.customerId) {
    return options.customerId;
  }

  const customers = await request('/customers');
  if (!customers || customers.length === 0) {
    throw new Error('No customers available for the provided API key.');
  }
  options.customerId = customers[0]._id;
  return options.customerId;
}

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function ensureMerchantId() {
  if (options.merchantId) {
    return options.merchantId;
  }
  const merchants = await request('/merchants');
  if (!merchants || merchants.length === 0) {
    throw new Error('No merchants available to create a purchase payload.');
  }
  options.merchantId = merchants[0]._id;
  return options.merchantId;
}

async function createSampleData(customerId) {
  const accountPayload = {
    type: 'Checking',
    nickname: `Auto Account ${new Date().getUTCFullYear()}`,
    rewards: 0,
    balance: 1500
  };

  const accountResponse = await request(`/customers/${customerId}/accounts`, {
    method: 'POST',
    body: accountPayload,
    expected: [201]
  });

  const accountId = accountResponse?.objectCreated?._id;
  if (!accountId) {
    throw new Error('Account creation succeeded but response did not include an account ID.');
  }

  const billPayload = {
    status: 'pending',
    payee: 'Utility Provider',
    nickname: 'Auto-created Bill',
    payment_date: isoDate(7),
    recurring_date: 15,
    payment_amount: 120
  };

  await request(`/accounts/${accountId}/bills`, {
    method: 'POST',
    body: billPayload,
    expected: [201]
  });

  const depositPayload = {
    medium: 'balance',
    transaction_date: isoDate(),
    status: 'pending',
    amount: 500,
    description: 'Sample Paycheck Deposit'
  };

  await request(`/accounts/${accountId}/deposits`, {
    method: 'POST',
    body: depositPayload,
    expected: [201]
  });

  const merchantId = await ensureMerchantId();

  const purchasePayload = {
    merchant_id: merchantId,
    medium: 'balance',
    purchase_date: isoDate(),
    amount: 120,
    status: 'pending',
    description: 'Sample Grocery Purchase'
  };

  await request(`/accounts/${accountId}/purchases`, {
    method: 'POST',
    body: purchasePayload,
    expected: [201]
  });

  return accountId;
}

async function fetchAccountDetails(account) {
  const [bills, deposits, purchases] = await Promise.all([
    request(`/accounts/${account._id}/bills`) || [],
    request(`/accounts/${account._id}/deposits`) || [],
    request(`/accounts/${account._id}/purchases`) || []
  ]);

  return {
    ...account,
    bills: bills || [],
    deposits: deposits || [],
    purchases: purchases || []
  };
}

async function run() {
  const customerId = await ensureCustomerId();

  if (options.createSample) {
    console.log('Creating sample account, bill, deposit, and purchase records...');
    await createSampleData(customerId);
  }

  console.log(`Fetching data for customer ${customerId}...`);
  const [customer, accounts] = await Promise.all([
    request(`/customers/${customerId}`),
    request(`/customers/${customerId}/accounts`)
  ]);

  if (!customer) {
    throw new Error(`Customer ${customerId} could not be retrieved.`);
  }

  const detailedAccounts = accounts && accounts.length
    ? await Promise.all(accounts.map(fetchAccountDetails))
    : [];

  const payload = {
    fetched_at: new Date().toISOString(),
    customer,
    accounts: detailedAccounts
  };

  await writeFile(options.output, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved data to ${options.output}`);
}

run().catch(error => {
  console.error(error.message);
  exit(1);
});
