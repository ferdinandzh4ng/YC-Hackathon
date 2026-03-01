"""
Test script: call POST /scrape/reviews/stream to get live_url first, open it, then wait for results.
Run from project root: python backend/test_reviews.py
Or from backend/: python test_reviews.py
"""
import json
import webbrowser
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

BASE = "http://localhost:8000"
URL = f"{BASE}/scrape/reviews/stream"
BODY = {"sources": ["google"], "query": "bakery", "location": "San Francisco"}


def main():
    print("Checking server at", BASE, "...", flush=True)
    try:
        with urlopen(f"{BASE}/", timeout=5) as r:
            r.read()
    except Exception as e:
        print("Server not reachable:", e)
        print("Start the backend with: cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        return
    print("Server OK. Sending POST /scrape/reviews/stream (live link first, then results)...", flush=True)
    req = Request(URL, data=json.dumps(BODY).encode(), method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req, timeout=900) as resp:
            for line in resp:
                line = line.decode().strip()
                if not line:
                    continue
                data = json.loads(line)
                status = data.get("status", "")
                live_urls = data.get("live_urls") or {}
                if status == "running" and live_urls:
                    print("\nLive URL(s) received — open in browser to watch:", flush=True)
                    for source, url in live_urls.items():
                        if url:
                            print(f"  {source}: {url}", flush=True)
                            webbrowser.open(url)
                    print("Waiting for agent to finish...", flush=True)
                elif status == "done":
                    print("\n--- Full response ---")
                    print(json.dumps(data, indent=2))
                    break
    except HTTPError as e:
        print(f"HTTP error: {e.code} {e.reason}")
        if e.fp:
            print(e.fp.read().decode())
        return
    except URLError as e:
        print(f"Request failed: {e.reason}")
        return
    except TimeoutError:
        print("Request timed out after 15 min. Agent may still be running; check the live URL.")
        return


if __name__ == "__main__":
    main()
