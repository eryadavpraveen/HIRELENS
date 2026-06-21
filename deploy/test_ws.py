import asyncio
import sys

try:
    import websockets
except ImportError:
    print("pip install websockets")
    sys.exit(1)


async def test(short: bool, token: str | None = None):
    base = "wss://toe-greatly-jeans-collectibles.trycloudflare.com/ws/interview/b7315852-747e-4071-a59b-bbcf09f037cb"
    if short:
        url = f"{base}?role=student"
    else:
        url = f"{base}?role=student&token={token or 'invalid'}"
    print(f"URL length: {len(url)}")
    try:
        async with websockets.connect(url) as ws:
            print("connected")
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            print("msg:", msg[:300])
    except Exception as e:
        print("error:", type(e).__name__, e)


async def main():
    fake_long_token = "x" * 2000
    print("--- localhost short ---")
    url = "ws://127.0.0.1:8000/ws/interview/b7315852-747e-4071-a59b-bbcf09f037cb?role=student"
    print(f"URL length: {len(url)}")
    try:
        async with websockets.connect(url) as ws:
            print("connected")
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            print("msg:", msg[:300])
    except Exception as e:
        print("error:", type(e).__name__, e)

    print("--- tunnel short ---")
    await test(short=True)


if __name__ == "__main__":
    asyncio.run(main())
