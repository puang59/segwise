"""
SQLite Connection & Query Utility Module for Retail Bank Customer Segmentation.

This module provides thread-safe connection handling, PRAGMA table inspection,
and query execution helpers for `bank_sqlite.db`.
"""

import os
import sqlite3
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional

# Resolve default DB path relative to project root or workspace
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = BASE_DIR / "datasets" / "bank_sqlite.db"


def get_db_path(db_path: Optional[str | Path] = None) -> Path:
    """Return resolved Path object for SQLite database file."""
    if db_path:
        return Path(db_path).resolve()
    env_path = os.getenv("BANK_DB_PATH")
    if env_path:
        return Path(env_path).resolve()
    return DEFAULT_DB_PATH.resolve()


def get_connection(db_path: Optional[str | Path] = None) -> sqlite3.Connection:
    """
    Create a thread-safe connection to the SQLite database.
    Uses check_same_thread=False for safe access across FastAPI request threads,
    and applies PRAGMAs for fast read query execution.
    """
    target_path = get_db_path(db_path)
    if not target_path.exists():
        raise FileNotFoundError(f"Database file not found at: {target_path}")
    
    conn = sqlite3.connect(str(target_path), check_same_thread=False)
    # Apply read performance pragmas
    conn.execute("PRAGMA cache_size = -64000;")  # 64MB page cache
    conn.execute("PRAGMA temp_store = MEMORY;")
    return conn


def get_all_tables(db_path: Optional[str | Path] = None) -> List[str]:
    """Retrieve list of all table names present in the SQLite database."""
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row[0] for row in cursor.fetchall()]
        return tables
    finally:
        conn.close()


def get_table_columns(table_name: str, db_path: Optional[str | Path] = None) -> List[str]:
    """
    Returns list of column names for a given table via `PRAGMA table_info`.
    """
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = [row[1] for row in cursor.fetchall()]
        return columns
    finally:
        conn.close()


def get_table_schema_info(table_name: str, db_path: Optional[str | Path] = None) -> List[Dict[str, Any]]:
    """
    Returns detailed schema metadata (cid, name, type, notnull, dflt_value, pk)
    for a given table via `PRAGMA table_info`.
    """
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name});")
        rows = cursor.fetchall()
        schema_info = [
            {
                "cid": row[0],
                "name": row[1],
                "type": row[2],
                "notnull": bool(row[3]),
                "default_value": row[4],
                "pk": bool(row[5])
            }
            for row in rows
        ]
        return schema_info
    finally:
        conn.close()


def get_table_row_count(table_name: str, db_path: Optional[str | Path] = None) -> int:
    """Returns row count for a specified table."""
    conn = get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        return count
    finally:
        conn.close()


def fetch_customer_data(
    columns: Optional[List[str]] = None,
    where_clause: str = "",
    params: tuple = (),
    limit: Optional[int] = None,
    db_path: Optional[str | Path] = None
) -> pd.DataFrame:
    """
    Load data from `customer_profile` analytical table into a Pandas DataFrame.

    :param columns: List of columns to select. Selects all columns if None.
    :param where_clause: Optional SQL WHERE condition (e.g. "total_balance > 50000").
    :param params: Parameter tuple for parameterized SQL queries.
    :param limit: Optional integer row limit.
    :param db_path: Optional custom path to SQLite database.
    :return: Pandas DataFrame containing queried customer profiles.
    """
    conn = get_connection(db_path)
    try:
        cols_str = ", ".join(columns) if columns else "*"
        sql = f"SELECT {cols_str} FROM customer_profile"
        if where_clause:
            sql += f" WHERE {where_clause}"
        if limit is not None and limit > 0:
            sql += f" LIMIT {limit}"
        
        df = pd.read_sql_query(sql, conn, params=params)
        return df
    finally:
        conn.close()


def execute_read_query(
    sql_query: str,
    params: tuple = (),
    db_path: Optional[str | Path] = None
) -> pd.DataFrame:
    """Execute arbitrary read-only SQL query and return DataFrame."""
    conn = get_connection(db_path)
    try:
        df = pd.read_sql_query(sql_query, conn, params=params)
        return df
    finally:
        conn.close()
