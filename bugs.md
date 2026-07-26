# Codebase Bug Report

This document lists all the identified functional and logical bugs across the backend and frontend of the Segwise application, along with proposed fixes.

## 1. Backend: Invalid Keyword Arguments in `customers.py`
**Location**: `backend/routers/customers.py`, Line 120
**Bug**: The `explain_customer_shap` function is called with `customer_id` and `feature_cols` keyword arguments, but the function signature expects `customer_row` and `features`.
**Impact**: Runtime `TypeError` when the SHAP explanation endpoint for a specific customer is hit.
**Fix**: 
Change the function call in `customers.py` from:
```python
explain_customer_shap(customer_id=..., feature_cols=...)
```
To:
```python
explain_customer_shap(customer_row=..., features=...)
```
Ensure you actually fetch or pass the correct `customer_row` data if the function expects a row rather than an ID.

## 2. Backend: Unsafe `len()` Calls on Potentially `None` Values
**Location**: `backend/routers/chat.py`, Lines 141, 159, 164
**Bug**: The code attempts to call `len()` on values retrieved from the `state` dictionary (like `state.get('resolved_columns', [])` or `state.get('engineered_features', [])`). If the agent sets these keys to explicitly `None` in the state rather than an empty list, `len(None)` will raise a `TypeError`.
**Impact**: SSE Chat stream will crash and close unexpectedly if an agent fails or returns `None` for lists.
**Fix**:
Safeguard the values before calling `len()`. E.g.:
```python
resolved = state.get('resolved_columns') or []
# Then use len(resolved)
```
Or directly inline: `len(state.get('resolved_columns') or [])`.

## 3. Backend: Passing `None` to `save_message`
**Location**: `backend/routers/chat.py`, Line 326
**Bug**: `fallback_state.get("narrative", "Analysis completed.")` could potentially evaluate to `None` if `"narrative"` is explicitly set to `None` in the state. `save_message` expects a strictly typed `str`.
**Impact**: Database insertion failure or Type errors.
**Fix**:
Use a safeguard:
```python
narrative_text = fallback_state.get("narrative") or "Analysis completed."
```

## 4. Backend: `resolve_columns` Expected `str`, got `str | None`
**Location**: `backend/agents/vihaan.py`, Line 30
**Bug**: `resolve_columns(state.get("db_path"))` where `db_path` might be `None`. 
**Impact**: The tool will fail if the DB path is missing.
**Fix**: 
Assert or fallback to the default DB path before passing:
```python
db_path = state.get("db_path") or "bank_sqlite.db"
resolve_columns(db_path)
```

## 5. Backend: Dictionary `get` with `None` Key
**Location**: `backend/agents/myra.py`, Lines 200, 259
**Bug**: `intent = state.get("intent")`, which can be `None`, is then used in a dictionary lookup: `INTENT_MAPPING.get(intent)`.
**Impact**: Fails to lookup properly or raises warnings.
**Fix**:
Fallback to a default string:
```python
intent = state.get("intent") or "segment"
```

## 6. Frontend: State Mutation and Concurrency in SSE Streams
**Location**: `frontend/app/page.tsx`, `pushUpdate` function inside `handleSendMessage`
**Bug**: The function mutates `currentTraceItems` and relies on React's `flushSync` combined with the callback form of `setMessages`. While this generally works in React 18, `currentTraceItems` is updated across different events but the state update closure might capture stale references if `isStreaming` triggers re-renders. 
**Impact**: Trace items in the UI might occasionally glitch, duplicate, or not show the 'done' status if events arrive too quickly.
**Fix**:
Instead of managing mutable variables like `currentTraceItems` inside the function block, it's safer to manage these using functional state updates or a `useReducer` to guarantee that every event always computes the next state from the strictly previous state, removing the need for `flushSync`.

## 7. Backend: Unused Variables & Imports (Code Quality)
**Location**: Across multiple files (`kabir.py`, `clustering.py`, `aadhya.py`)
**Bug**: Variables like `where_parts` (kabir.py:48), `e` (clustering.py:220, 225) are assigned but never used. Multiple unused imports like `pandas as pd` (kabir.py, tools/column_resolver.py). 
**Impact**: Messy codebase, potential confusion, slightly increased memory overhead.
**Fix**:
Clean up imports and remove unused variables using `autoflake` or manual deletion as flagged by `flake8`.
