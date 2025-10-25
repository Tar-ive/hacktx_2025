"""
Deterministic agent routing using pure if/elif/else logic.
NO machine learning, NO confidence scores.
"""

from .triggers import (
    SENTINEL_KEYWORDS,
    ATLAS_KEYWORDS,
    NEBULA_KEYWORDS,
    NOVA_KEYWORDS
)


def route_to_agent(message: str) -> dict:
    """
    Deterministically select agent based on keyword matching.

    Priority order:
    1. Sentinel (security is highest priority)
    2. Atlas (investment/long-term)
    3. Nebula (daily spending)
    4. Nova (fallback)

    Returns:
        {
            "agent": "sentinel" | "atlas" | "nebula" | "nova",
            "matched_keywords": list[str],
            "reasoning": str
        }
    """
    message_lower = message.lower()
    words = set(message_lower.split())

    # Also check for multi-word phrases
    message_phrases = message_lower

    # STEP 1: Check SENTINEL (highest priority for security)
    sentinel_matches = []
    for keyword in SENTINEL_KEYWORDS:
        if keyword in words or keyword in message_phrases:
            sentinel_matches.append(keyword)

    if sentinel_matches:
        return {
            "agent": "sentinel",
            "matched_keywords": sentinel_matches,
            "reasoning": f"Security keywords detected: {', '.join(sentinel_matches)}"
        }

    # STEP 2: Check ATLAS (investment/long-term planning)
    atlas_matches = []
    for keyword in ATLAS_KEYWORDS:
        if keyword in words or keyword in message_phrases:
            atlas_matches.append(keyword)

    if atlas_matches:
        return {
            "agent": "atlas",
            "matched_keywords": atlas_matches,
            "reasoning": f"Investment keywords detected: {', '.join(atlas_matches)}"
        }

    # STEP 3: Check NEBULA (daily spending/budgeting)
    nebula_matches = []
    for keyword in NEBULA_KEYWORDS:
        if keyword in words or keyword in message_phrases:
            nebula_matches.append(keyword)

    # Special case: "save"/"saving" resolution
    if any(kw in ["save", "saving"] for kw in words):
        # Check if it's Atlas-related (retirement/investment context)
        atlas_context_words = ["retirement", "invest", "long-term", "future", "wealth"]
        if any(atlas_kw in message_phrases for atlas_kw in atlas_context_words):
            return {
                "agent": "atlas",
                "matched_keywords": ["saving (retirement context)"],
                "reasoning": "Saving in context of retirement/investment"
            }
        else:
            # Default "save" to Nebula (daily spending context)
            nebula_matches.append("save")

    if nebula_matches:
        return {
            "agent": "nebula",
            "matched_keywords": nebula_matches,
            "reasoning": f"Spending keywords detected: {', '.join(nebula_matches)}"
        }

    # STEP 4: Check NOVA (general queries)
    nova_matches = []
    for keyword in NOVA_KEYWORDS:
        if keyword in words or keyword in message_phrases:
            nova_matches.append(keyword)

    if nova_matches:
        return {
            "agent": "nova",
            "matched_keywords": nova_matches,
            "reasoning": f"General query keywords detected: {', '.join(nova_matches)}"
        }

    # STEP 5: Fallback to NOVA (no keywords matched)
    return {
        "agent": "nova",
        "matched_keywords": [],
        "reasoning": "No specific keywords matched, using general assistant"
    }


def test_routing():
    """Test cases to validate routing."""
    test_cases = [
        ("I think my card was stolen", "sentinel"),
        ("How much should I invest for retirement?", "atlas"),
        ("How much did I spend on groceries?", "nebula"),
        ("What's my account balance?", "nova"),
        ("Suspicious charge on my account", "sentinel"),
        ("I'm saving for retirement", "atlas"),
        ("I want to save money on food", "nebula"),
        ("fraud alert", "sentinel"),
        ("can i afford this", "nebula"),
        ("hello", "nova"),
    ]

    print("\nTesting agent routing logic:")
    print("=" * 70)

    all_passed = True
    for message, expected_agent in test_cases:
        result = route_to_agent(message)
        actual_agent = result["agent"]
        status = "✓" if actual_agent == expected_agent else "✗"

        if actual_agent != expected_agent:
            all_passed = False

        print(f"{status} '{message}'")
        print(f"   → {actual_agent} (expected: {expected_agent})")
        print(f"   Reasoning: {result['reasoning']}\n")

    if all_passed:
        print("✓ All routing tests passed!")
    else:
        print("✗ Some routing tests failed")

    return all_passed
