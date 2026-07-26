import httpx
import asyncio
import time

async def main():
    async with httpx.AsyncClient() as client:
        start = time.time()
        async with client.stream("POST", "http://localhost:8000/chat", json={"message": "Segment retail customers into priority, regular, and dormant tiers based on balance and transaction frequency."}, timeout=60.0) as response:
            async for line in response.aiter_lines():
                if line and not line.startswith(":"):
                    print(f"[{time.time() - start:.2f}s] {line}")

asyncio.run(main())
