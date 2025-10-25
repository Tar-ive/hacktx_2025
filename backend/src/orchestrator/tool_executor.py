"""
Parallel tool execution for the orchestrator.
Tools run concurrently and return results to orchestrator only.
Agents do NOT have direct tool access.
"""

import asyncio
from typing import Dict, List, Any
import time


class ToolExecutor:
    """
    Executes multiple tools in parallel and aggregates results.
    """

    def __init__(self, tools_registry: dict):
        self.tools = tools_registry

    async def execute_parallel(self, tool_calls: List[Dict]) -> Dict[str, Any]:
        """
        Execute multiple tool calls in parallel.

        Args:
            tool_calls: [
                {"tool": "get_transactions", "params": {"account_id": "...", "days": 30}},
                {"tool": "get_balance", "params": {"account_id": "..."}},
                {"tool": "analyze_spending", "params": {"account_id": "..."}}
            ]

        Returns:
            {
                "get_transactions": [...],
                "get_balance": 1500.00,
                "analyze_spending": {...},
                "execution_time_ms": 450
            }
        """
        if not tool_calls:
            return {"execution_time_ms": 0}

        tasks = []
        tool_names = []

        for call in tool_calls:
            tool_name = call["tool"]
            params = call.get("params", {})

            if tool_name not in self.tools:
                raise ValueError(f"Tool '{tool_name}' not found in registry")

            tool_func = self.tools[tool_name]
            tasks.append(self._execute_with_timeout(tool_func, params))
            tool_names.append(tool_name)

        # Execute all tools in parallel
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        execution_time = (time.time() - start_time) * 1000

        # Aggregate results
        aggregated = {}
        for tool_name, result in zip(tool_names, results):
            if isinstance(result, Exception):
                aggregated[tool_name] = {"error": str(result)}
            else:
                aggregated[tool_name] = result

        aggregated["execution_time_ms"] = round(execution_time, 2)
        return aggregated

    async def _execute_with_timeout(self, func, params: dict, timeout: int = 10):
        """Execute single tool with timeout"""
        try:
            # Check if function is async
            if asyncio.iscoroutinefunction(func):
                return await asyncio.wait_for(func(**params), timeout=timeout)
            else:
                # Run sync function in executor
                loop = asyncio.get_event_loop()
                return await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: func(**params)),
                    timeout=timeout
                )
        except asyncio.TimeoutError:
            raise TimeoutError(f"Tool execution exceeded {timeout}s timeout")


def determine_tools_for_agent(agent: str, customer_id: str) -> List[Dict]:
    """
    Map agent to required tool calls.
    This is deterministic and based on agent type.
    """

    if agent == "nebula":
        # Nebula always needs: transactions, balance, spending analysis
        return [
            {"tool": "get_recent_transactions", "params": {"customer_id": customer_id, "days": 30}},
            {"tool": "get_account_balance", "params": {"customer_id": customer_id}},
            {"tool": "analyze_spending_patterns", "params": {"customer_id": customer_id}}
        ]

    elif agent == "atlas":
        # Atlas needs: accounts overview, deposits, savings rate
        return [
            {"tool": "get_all_accounts", "params": {"customer_id": customer_id}},
            {"tool": "get_deposits_history", "params": {"customer_id": customer_id, "months": 12}},
            {"tool": "calculate_savings_rate", "params": {"customer_id": customer_id}}
        ]

    elif agent == "sentinel":
        # Sentinel needs: recent transactions, anomaly detection
        return [
            {"tool": "get_recent_transactions", "params": {"customer_id": customer_id, "days": 7}},
            {"tool": "detect_unusual_transactions", "params": {"customer_id": customer_id}},
            {"tool": "get_security_score", "params": {"customer_id": customer_id}}
        ]

    elif agent == "nova":
        # Nova needs: basic account info
        return [
            {"tool": "get_customer_info", "params": {"customer_id": customer_id}},
            {"tool": "get_all_accounts", "params": {"customer_id": customer_id}}
        ]

    return []
