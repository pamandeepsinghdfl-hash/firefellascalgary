#!/usr/bin/env python3
"""Public visa-slot mentions monitor.

Polls a list of public RSS/Atom feeds (Reddit subreddits, State Dept
news, etc.) for new posts that mention Calgary + B1/B2 / slot /
appointment keywords. Sends a Telegram alert with the link.

No login, no captcha, no scraping AIS. Fully public sources.
"""
from __future__ import annotations

import html
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
STATE_FILE = HERE / "seen_public.json"
SOURCES_FILE = HERE / "sources.txt"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Default keyword patterns. Override via env: KEYWORDS_LOCATION + KEYWORDS_TOPIC
# (comma-separated). An item must match at least one term from EACH list.
DEFAULT_LOC = [
    "calgary", "yyc", "vancouver", "yvr", "toronto", "yyz",
    "ottawa", "montreal", "yul", "halifax", "canada"
]
DEFAULT_TOPIC = [
    "b1", "b2", "b1/b2", "b1b2",
    "visitor visa", "us visa", "u.s. visa", "us embassy", "us consulate",
    "ais", "usvisa", "appointment", "interview slot", "slot open",
    "earlier date", "rescheduled", "new dates"
]


# ---------- HTTP ----------

def fetch(url: str, timeout: int = 25) -> str | None:
    try:
        r = requests.get(
            url,
            headers={"user-agent": UA, "accept": "application/atom+xml, application/rss+xml, application/xml, text/xml, */*"},
            timeout=timeout,
        )
        if not r.ok:
            print(f"  {r.status_code} {url}")
            return None
        return r.text
    except requests.RequestException as e:
        print(f"  ERR {url}: {e}")
        return None


# ---------- Feed parsing (RSS + Atom) ----------

def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[1] if "}" in tag else tag


def parse_feed(xml_text: str) -> list[dict]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    items: list[dict] = []
    # RSS 2.0: <rss><channel><item>...
    for item in root.iter():
        if _strip_ns(item.tag) not in ("item", "entry"):
            continue
        rec: dict[str, str] = {}
        for child in item:
            t = _strip_ns(child.tag).lower()
            text = (child.text or "").strip()
            if t == "link":
                # Atom: <link href="..."/>
                href = child.attrib.get("href")
                if href and not rec.get("link"):
                    rec["link"] = href
                elif text and not rec.get("link"):
                    rec["link"] = text
            elif t in ("title", "id", "guid", "pubdate", "updated", "published",
                       "description", "summary", "content"):
                key = "guid" if t in ("id", "guid") else t
                if text:
                    rec.setdefault(key, text)
            elif t == "encoded" or t.endswith(":encoded"):
                rec.setdefault("description", text)
        if rec.get("link") or rec.get("guid"):
            items.append(rec)
    return items


# ---------- Filtering ----------

_word_re_cache: dict[tuple[str, ...], re.Pattern] = {}


def _word_re(words: tuple[str, ...]) -> re.Pattern:
    if words in _word_re_cache:
        return _word_re_cache[words]
    parts = [re.escape(w) for w in words]
    rx = re.compile(r"(?:^|[^a-z0-9])(?:" + "|".join(parts) + r")(?:[^a-z0-9]|$)", re.I)
    _word_re_cache[words] = rx
    return rx


def matches(item: dict, locs: tuple[str, ...], topics: tuple[str, ...]) -> bool:
    haystack = " ".join(
        item.get(k, "") for k in ("title", "description", "summary", "content")
    )
    haystack = html.unescape(re.sub(r"<[^>]+>", " ", haystack))
    return bool(_word_re(locs).search(haystack)) and bool(_word_re(topics).search(haystack))


# ---------- State ----------

def load_seen() -> dict:
    if not STATE_FILE.exists():
        return {"version": 1, "ids": [], "initialized": False}
    try:
        d = json.loads(STATE_FILE.read_text())
        if d.get("version") != 1:
            return {"version": 1, "ids": [], "initialized": False}
        d.setdefault("ids", [])
        d.setdefault("initialized", bool(d["ids"]))
        return d
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "ids": [], "initialized": False}


def save_seen(state: dict) -> None:
    # bound the list at 5000 entries (drop oldest)
    state["ids"] = state["ids"][-5000:]
    state["last_run"] = datetime.now(timezone.utc).isoformat()
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ---------- Sources ----------

def load_sources() -> list[str]:
    if not SOURCES_FILE.exists():
        return []
    out = []
    for line in SOURCES_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.append(line)
    return out


# ---------- Notification ----------

def send_telegram(matches_list: list[tuple[str, dict]]) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not (token and chat):
        print("  telegram not configured")
        return False

    parts = [f"🛂 *{len(matches_list)} public post(s) about US visa slots*"]
    for src, item in matches_list[:10]:
        title = item.get("title", "(no title)").strip()
        title = re.sub(r"\s+", " ", title)[:150]
        link = item.get("link", "")
        parts.append(f"\n*{title}*\n_{src}_\n{link}")

    body = "\n".join(parts)[:4000]
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": chat,
                "text": body,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True,
            },
            timeout=20,
        )
        if r.ok:
            print(f"  telegram: sent {len(matches_list)} match(es)")
            return True
        print(f"  telegram FAILED: {r.status_code} {r.text[:200]}")
        return False
    except requests.RequestException as e:
        print(f"  telegram FAILED: {e}")
        return False


# ---------- Main ----------

def _csv_env(name: str, default: list[str]) -> tuple[str, ...]:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return tuple(default)
    return tuple(w.strip().lower() for w in raw.split(",") if w.strip())


def main() -> int:
    print(f"=== run at {datetime.now(timezone.utc).isoformat()} ===")
    sources = load_sources()
    if not sources:
        print("ERROR: no sources in sources.txt", file=sys.stderr)
        return 1

    locs = _csv_env("KEYWORDS_LOCATION", DEFAULT_LOC)
    topics = _csv_env("KEYWORDS_TOPIC", DEFAULT_TOPIC)
    print(f"sources: {len(sources)}  locs: {len(locs)}  topics: {len(topics)}")

    state = load_seen()
    seen_ids = set(state["ids"])
    new_matches: list[tuple[str, dict]] = []
    all_new_ids: list[str] = []

    for url in sources:
        print(f"- {url}")
        body = fetch(url)
        if not body:
            continue
        items = parse_feed(body)
        if not items:
            print("  no items parsed")
            continue
        print(f"  {len(items)} item(s)")
        for it in items:
            uid = it.get("guid") or it.get("link")
            if not uid or uid in seen_ids:
                continue
            all_new_ids.append(uid)
            if matches(it, locs, topics):
                new_matches.append((url, it))

    if not state.get("initialized"):
        # cold start: record everything currently visible as seen, no alert
        state["ids"].extend(all_new_ids)
        state["initialized"] = True
        save_seen(state)
        print(f"COLD-START: baselined {len(all_new_ids)} items; no alert sent.")
        return 0

    print(f"new items: {len(all_new_ids)}  matching: {len(new_matches)}")

    if not new_matches:
        state["ids"].extend(all_new_ids)
        save_seen(state)
        return 0

    sent = send_telegram(new_matches)
    if not sent:
        # don't mark as seen so we retry next run
        print("alert failed; NOT saving state to retry next run", file=sys.stderr)
        return 1

    state["ids"].extend(all_new_ids)
    save_seen(state)
    for src, it in new_matches:
        print(f"  MATCH  {src}\n         {it.get('title', '?')[:120]}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
