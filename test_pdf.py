import requests

res = requests.post("http://localhost:8000/export/pdf", json={"session_id": "test-123", "bank_name": "Test Bank", "report_title": "Test Report"})
print(f"Status: {res.status_code}")
print(f"Content-Type: {res.headers.get('Content-Type')}")
print(f"Size: {len(res.content)} bytes")
