// NESSIE API Service for Capital One account data matching and fetching

interface NessieCustomer {
  _id: string;
  first_name: string;
  last_name: string;
  address: {
    street_number: string;
    street_name: string;
    city: string;
    state: string;
    zip: string;
  };
}

interface NessieAccount {
  _id: string;
  type: string;
  nickname: string;
  rewards: number;
  balance: number;
  customer_id: string;
  bills?: any[];
  deposits?: any[];
  purchases?: any[];
}

interface NessieCustomerData {
  fetched_at: string;
  customer: NessieCustomer;
  accounts: NessieAccount[];
}

interface MatchingResult {
  matched: boolean;
  customerData?: NessieCustomerData;
  confidence: number;
  matchReason: string;
}

class NessieService {
  private static instance: NessieService;
  private demoCustomers: NessieCustomerData[] = [];

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): NessieService {
    if (!NessieService.instance) {
      NessieService.instance = new NessieService();
    }
    return NessieService.instance;
  }

  /**
   * Load demo customer data for testing
   */
  async loadDemoData(): Promise<void> {
    try {
      // For now, let's use inline demo data to avoid import issues
      this.demoCustomers = [{
        "fetched_at": new Date().toISOString(),
        "customer": {
          "_id": "68f42c289683f20dd51a0293",
          "first_name": "Taylor",
          "last_name": "River",
          "address": {
            "street_number": "123",
            "street_name": "Startup Ave",
            "city": "Austin",
            "state": "TX",
            "zip": "73301"
          }
        },
        "accounts": [
          {
            "_id": "68f42c409683f20dd51a0294",
            "type": "Checking",
            "nickname": "Primary Checking",
            "rewards": 0,
            "balance": 2500,
            "customer_id": "68f42c289683f20dd51a0293",
            "bills": [],
            "deposits": [
              {
                "_id": "deposit1",
                "medium": "balance",
                "transaction_date": "2025-10-19",
                "status": "executed",
                "amount": 1000,
                "description": "Paycheck Deposit",
                "type": "deposit"
              }
            ],
            "purchases": [
              {
                "_id": "purchase1",
                "medium": "balance",
                "purchase_date": "2025-10-18",
                "amount": 85.50,
                "status": "executed",
                "description": "Grocery Store",
                "type": "merchant"
              }
            ]
          }
        ]
      }];

      console.log('Demo data loaded successfully');
    } catch (error) {
      console.error('Failed to load demo data:', error);
      throw new Error('Unable to load customer data');
    }
  }

  /**
   * Find matching Capital One account based on user details
   */
  async findMatchingAccount(
    firstName: string,
    lastName: string,
    zip: string
  ): Promise<MatchingResult> {
    // Ensure demo data is loaded
    if (this.demoCustomers.length === 0) {
      await this.loadDemoData();
    }

    const normalizedFirstName = firstName.toLowerCase().trim();
    const normalizedLastName = lastName.toLowerCase().trim();
    const normalizedZip = zip.trim();

    // Search through demo customers for matches
    for (const customerData of this.demoCustomers) {
      const customer = customerData.customer;

      // Calculate match score based on different criteria
      let matchScore = 0;
      let matchReasons: string[] = [];

      // Name matching (highest weight)
      if (customer.first_name.toLowerCase() === normalizedFirstName &&
          customer.last_name.toLowerCase() === normalizedLastName) {
        matchScore += 50;
        matchReasons.push('Exact name match');
      } else if (customer.first_name.toLowerCase().includes(normalizedFirstName) ||
                 customer.last_name.toLowerCase().includes(normalizedLastName)) {
        matchScore += 25;
        matchReasons.push('Partial name match');
      }

      // Zip matching (medium weight)
      if (customer.address.zip === normalizedZip) {
        matchScore += 30;
        matchReasons.push('Zip code match');
      }

      // Consider it a match if we have reasonable confidence
      if (matchScore >= 30) {
        return {
          matched: true,
          customerData,
          confidence: matchScore,
          matchReason: matchReasons.join(', ')
        };
      }
    }

    // Special case: For demo purposes, match Taylor River's data for testing
    if (
      normalizedFirstName.includes('taylor') ||
      normalizedLastName.includes('river') ||
      normalizedZip === '73301'
    ) {
      if (this.demoCustomers.length > 0) {
        return {
          matched: true,
          customerData: this.demoCustomers[0],
          confidence: 40,
          matchReason: 'Demo account match'
        };
      }
    }

    return {
      matched: false,
      confidence: 0,
      matchReason: 'No matching account found'
    };
  }

  /**
   * Format account data for UI display
   */
  formatAccountDisplayData(customerData: NessieCustomerData) {
    const totalBalance = customerData.accounts.reduce((sum, account) => sum + account.balance, 0);
    const totalTransactions = customerData.accounts.reduce((sum, account) =>
      sum + (account.purchases?.length || 0) + (account.deposits?.length || 0), 0
    );

    return {
      customerName: `${customerData.customer.first_name} ${customerData.customer.last_name}`,
      totalAccounts: customerData.accounts.length,
      totalBalance,
      totalTransactions,
      accounts: customerData.accounts.map(account => ({
        id: account._id,
        type: account.type,
        nickname: account.nickname,
        balance: account.balance,
        transactionCount: (account.purchases?.length || 0) + (account.deposits?.length || 0),
        recentTransactions: [
          ...(account.purchases?.slice(0, 3).map(t => ({
            id: t._id,
            description: t.description,
            amount: -t.amount,
            date: t.purchase_date,
            type: 'purchase' as const
          })) || []),
          ...(account.deposits?.slice(0, 3).map(t => ({
            id: t._id,
            description: t.description,
            amount: t.amount,
            date: t.transaction_date,
            type: 'deposit' as const
          })) || [])
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      })),
      address: customerData.customer.address,
      customerId: customerData.customer._id
    };
  }

  /**
   * Simulate importing transaction data into Rebank
   */
  async importAccountData(customerData: NessieCustomerData) {
    // In a real app, this would call the Rebank backend API
    // For demo purposes, we'll simulate the import process

    const formattedData = this.formatAccountDisplayData(customerData);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Importing account data:', formattedData);

    return {
      success: true,
      message: 'Successfully imported account data',
      data: formattedData
    };
  }

  /**
   * Get all available demo customers (for testing)
   */
  getDemoCustomers(): NessieCustomerData[] {
    return this.demoCustomers;
  }
}

export default NessieService;
export type { MatchingResult, NessieCustomerData };