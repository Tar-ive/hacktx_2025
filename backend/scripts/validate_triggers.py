#!/usr/bin/env python3
"""
Validate that trigger keywords don't overlap between agents.
Run this before deployment.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.orchestrator.triggers import (
    SENTINEL_KEYWORDS,
    ATLAS_KEYWORDS,
    NEBULA_KEYWORDS,
    NOVA_KEYWORDS,
    validate_no_overlap
)
from src.orchestrator.router import test_routing


def main():
    print("Validating trigger keyword configuration...")
    print("=" * 60)

    # Check for overlaps
    try:
        validate_no_overlap()
        print("\n✓ No keyword overlaps detected")
    except ValueError as e:
        print(f"\n✗ ERROR: {e}")
        sys.exit(1)

    # Print statistics
    total = (
        len(SENTINEL_KEYWORDS) +
        len(ATLAS_KEYWORDS) +
        len(NEBULA_KEYWORDS) +
        len(NOVA_KEYWORDS)
    )

    print(f"\nKeyword distribution:")
    print(f"  Sentinel: {len(SENTINEL_KEYWORDS)} keywords")
    print(f"  Atlas:    {len(ATLAS_KEYWORDS)} keywords")
    print(f"  Nebula:   {len(NEBULA_KEYWORDS)} keywords")
    print(f"  Nova:     {len(NOVA_KEYWORDS)} keywords")
    print(f"  Total:    {total} unique keywords")

    # Run routing tests
    print("\n" + "=" * 60)
    all_passed = test_routing()

    if all_passed:
        print("\n" + "=" * 60)
        print("✓ All validations passed!")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("✗ Some validations failed")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
