import pandas as pd
import sqlite3
import numpy as np

from backend.db.sqlite_client import get_connection
conn = get_connection()
df = pd.read_sql_query('SELECT * FROM customer_profile', conn)

from backend.tools.feature_engineering import compute_churn_risk_score
import logging
logging.basicConfig(level=logging.ERROR)

scores = compute_churn_risk_score(df)
print(scores.describe())
print(f"Number of scores > 0.75: {len(scores[scores > 0.75])}")
print(f"Number of scores > 0.60: {len(scores[scores > 0.60])}")
print(f"Number of scores > 0.50: {len(scores[scores > 0.50])}")
print(f"Number of scores > 0.40: {len(scores[scores > 0.40])}")
