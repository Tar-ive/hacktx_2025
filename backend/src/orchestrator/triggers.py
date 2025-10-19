"""
Non-overlapping trigger keywords for deterministic agent routing.
Each keyword is mapped to EXACTLY ONE agent.
"""

# SENTINEL - Highest priority (security threats)
SENTINEL_KEYWORDS = {
    "fraud", "fraudulent", "scam", "scammer",
    "security", "secure", "unsafe", "insecure",
    "suspicious", "suspect", "unusual", "strange", "weird",
    "hack", "hacked", "hacker", "breach", "breached",
    "unauthorized", "unapproved", "unknown",
    "theft", "stolen", "thief", "robbed",
    "locked", "lock", "freeze", "frozen",
    "alert", "warning", "danger", "risk",
    "protect", "protection", "safe", "safety",
    "block", "blocked", "charge-back", "chargeback",
    "didn't", "didnt", "never", "not me", "wasn't"
}

# ATLAS - Investment/long-term planning
ATLAS_KEYWORDS = {
    "invest", "investing", "investment", "investor",
    "retirement", "retire", "retiring", "retired",
    "credit-score", "credit score", "fico",
    "long-term", "longterm", "long term",
    "wealth", "wealthy", "rich", "fortune",
    "portfolio", "holdings", "assets",
    "compound", "compounding", "interest",
    "stocks", "stock", "equities", "equity",
    "bonds", "bond", "fixed-income",
    "401k", "ira", "roth", "pension",
    "financial-planning", "financial planning", "financial plan",
    "grow", "growth", "growing", "appreciate", "appreciation",
    "returns", "return", "yield", "dividend",
    "diversify", "diversification", "allocate", "allocation"
}

# NEBULA - Daily spending/budgeting
NEBULA_KEYWORDS = {
    "spend", "spending", "spent", "spends",
    "budget", "budgeting", "budgeted",
    "afford", "affordable", "can i afford",
    "expensive", "pricey", "costly", "overpriced",
    "cheap", "inexpensive", "bargain", "deal",
    "transaction", "transactions", "charge", "charges",
    "purchase", "purchases", "purchased", "buying", "buy", "bought",
    "cost", "costs", "costing",
    "price", "prices", "pricing",
    "merchant", "store", "shop", "vendor",
    "category", "categories",
    "groceries", "grocery", "food", "restaurant", "dining",
    "shopping", "shopped",
    "coffee", "gas", "gasoline", "fuel",
    "utility", "utilities", "bill", "bills",
    "subscription", "subscriptions",
    "paying", "payment", "pay", "paid"
}

# NOVA - General/account queries (fallback)
NOVA_KEYWORDS = {
    "account", "accounts",
    "balance", "balances",
    "info", "information", "details",
    "help", "assist", "support",
    "transfer", "transfers", "transferring",
    "deposit", "deposits", "deposited",
    "withdrawal", "withdraw", "withdrawing",
    "question", "questions", "asking",
    "tell", "show", "display", "list",
    "what", "how", "when", "where", "who", "why",
    "hello", "hi", "hey", "greetings"
}


def validate_no_overlap():
    """
    Run at startup to ensure no keyword conflicts.
    Raises ValueError if overlap detected.
    """
    all_keywords = {}
    for agent, keywords in [
        ("sentinel", SENTINEL_KEYWORDS),
        ("atlas", ATLAS_KEYWORDS),
        ("nebula", NEBULA_KEYWORDS),
        ("nova", NOVA_KEYWORDS)
    ]:
        for keyword in keywords:
            if keyword in all_keywords:
                raise ValueError(
                    f"Keyword conflict: '{keyword}' in both "
                    f"{all_keywords[keyword]} and {agent}"
                )
            all_keywords[keyword] = agent

    print(f"✓ Trigger validation passed: {len(all_keywords)} unique keywords")
    return True


# Special case: "save" / "saving"
# Resolution: Context-based split
# - "saving for retirement" → ATLAS
# - "save money" / "saving on groceries" → NEBULA
# Implementation: Check if "retirement" in message → ATLAS, else NEBULA
