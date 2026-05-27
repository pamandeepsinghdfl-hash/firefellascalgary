#!/usr/bin/env python3
"""Amazon Calgary shift availability notifier.

Polls hiring.amazon.ca for warehouse/delivery shifts within ~50 km of
Calgary and pushes alerts (email + optional Telegram) when a new jobId
appears. Does NOT auto-apply.

Required env vars:
  SMTP_HOST  SMTP_PORT  SMTP_USER  SMTP_PASS  NOTIFY_TO

Optional env vars:
  BEARER_TOKEN        if Amazon starts requiring auth on the public endpoint
  TELEGRAM_BOT_TOKEN  enables instant phone push (recommended)
  TELEGRAM_CHAT_ID    your chat id (numeric, get from @userinfobot)
  SEARCH_RADIUS_KM    default 50
  QUIET_HOURS         "23-7" suppresses alerts 11pm-7am MT. Set "off" to disable.
  MIN_PAY             skip jobs paying below this (CAD/hr). Default 0.
  STATE_TTL_DAYS      forget jobIds older than this. Default 30.
"""
from __future__ import annotations

import json
import os
import smtplib
import sys
import time
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

STATE_FILE = Path(__file__).parent / "seen_jobs.json"
STATE_VERSION = 2
GRAPHQL_URL = "https://hiring.amazon.ca/app-api/career-site/graphql"
APPLY_BASE = "https://hiring.amazon.ca/app/#/jobDetail"
MT = ZoneInfo("America/Edmonton")  # Calgary timezone (handles MST/MDT)

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
COMMON_HEADERS = {
    "content-type": "application/json",
    "accept": "application/json",
    "country": "Canada",
    "iscanary": "false",
    "origin": "https://hiring.amazon.ca",
    "referer": "https://hiring.amazon.ca/app/",
    "user-agent": UA,
}

# Coordinates: downtown Calgary
CALGARY_LAT = 51.0447
CALGARY_LNG = -114.0719

SEARCH_QUERY = """
query searchJobCardsByLocation($searchJobRequest: SearchJobRequest!) {
  searchJobCardsByLocation(searchJobRequest: $searchJobRequest) {
    nextToken
    jobCards {
      jobId
      jobTitle
      locationName
      city
      state
      postalCode
      totalPayRateMin
      totalPayRateMax
      currencyCode
      scheduleCount
      employmentType
      employmentTypeL10N
      jobType
      jobTypeL10N
    }
  }
}
""".strip()

SCHEDULE_QUERY = """
query searchScheduleCards($searchScheduleRequest: SearchScheduleRequest!) {
  searchScheduleCards(searchScheduleRequest: $searchScheduleRequest) {
    nextToken
    scheduleCards {
      scheduleId
      scheduleText
      hoursPerWeek
      firstDayOnSite
      totalPayRate
      currencyCode
      scheduleBannerText
    }
  }
}
""".strip()


# ---------- HTTP with retries ----------

def _post_with_retry(url: str, payload: dict, headers: dict, *, tries: int = 3) -> dict:
    last_err: Exception | None = None
    for attempt in range(1, tries + 1):
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=30)
            if r.status_code in (401, 403):
                raise SystemExit(
                    f"Amazon rejected request ({r.status_code}). Set the "
                    "BEARER_TOKEN repo secret — copy the Authorization header "
                    "from DevTools > Network on hiring.amazon.ca."
                )
            if r.status_code >= 500 or r.status_code == 429:
                raise requests.HTTPError(f"{r.status_code} from Amazon", response=r)
            r.raise_for_status()
            data = r.json()
            if "errors" in data and data["errors"]:
                raise RuntimeError(f"GraphQL errors: {data['errors']}")
            return data
        except (requests.RequestException, RuntimeError, ValueError) as e:
            last_err = e
            if attempt < tries:
                backoff = 2 ** attempt
                print(f"  attempt {attempt} failed ({e}); retrying in {backoff}s")
                time.sleep(backoff)
    raise SystemExit(f"All {tries} attempts failed: {last_err}")


def _auth_headers() -> dict:
    headers = dict(COMMON_HEADERS)
    bearer = os.environ.get("BEARER_TOKEN", "").strip()
    if bearer:
        headers["authorization"] = (
            bearer if bearer.lower().startswith("bearer ") else f"Bearer {bearer}"
        )
    return headers


# ---------- Amazon API ----------

def fetch_jobs() -> list[dict]:
    radius = int(os.environ.get("SEARCH_RADIUS_KM", "50") or 50)
    headers = _auth_headers()
    all_cards: list[dict] = []
    next_token: str | None = None

    while True:
        variables = {
            "searchJobRequest": {
                "locale": "en-CA",
                "country": "Canada",
                "keyWords": "",
                "equalFilters": [],
                "containFilters": [{"key": "isPrivateSchedule", "val": ["false"]}],
                "rangeFilters": [],
                "orFilters": [],
                "sorters": [],
                "pageSize": 100,
                "geoQueryClause": {
                    "lat": CALGARY_LAT,
                    "lng": CALGARY_LNG,
                    "unit": "km",
                    "distance": radius,
                },
            }
        }
        if next_token:
            variables["searchJobRequest"]["nextToken"] = next_token

        payload = {
            "operationName": "searchJobCardsByLocation",
            "variables": variables,
            "query": SEARCH_QUERY,
        }
        data = _post_with_retry(GRAPHQL_URL, payload, headers)
        node = (data.get("data") or {}).get("searchJobCardsByLocation") or {}
        cards = node.get("jobCards") or []
        all_cards.extend(cards)
        next_token = node.get("nextToken")
        if not next_token or not cards:
            break
        if len(all_cards) > 500:  # sanity guard
            break
    return all_cards


def fetch_schedules(job_id: str) -> list[dict]:
    """Best-effort schedule fetch. Failures return []."""
    payload = {
        "operationName": "searchScheduleCards",
        "variables": {
            "searchScheduleRequest": {
                "locale": "en-CA",
                "country": "Canada",
                "jobId": job_id,
                "pageSize": 10,
                "equalFilters": [],
                "containFilters": [],
                "rangeFilters": [],
                "orFilters": [],
                "sorters": [],
            }
        },
        "query": SCHEDULE_QUERY,
    }
    try:
        data = _post_with_retry(GRAPHQL_URL, payload, _auth_headers(), tries=2)
    except SystemExit:
        return []
    node = (data.get("data") or {}).get("searchScheduleCards") or {}
    return node.get("scheduleCards") or []


# ---------- State ----------

def load_state() -> dict:
    if not STATE_FILE.exists():
        return {"version": STATE_VERSION, "seen": {}, "initialized": False}
    try:
        raw = json.loads(STATE_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return {"version": STATE_VERSION, "seen": {}, "initialized": False}
    if not isinstance(raw, dict) or raw.get("version") != STATE_VERSION:
        return {"version": STATE_VERSION, "seen": {}, "initialized": False}
    raw.setdefault("seen", {})
    raw.setdefault("initialized", bool(raw["seen"]))
    return raw


def prune(state: dict) -> dict:
    ttl_days = int(os.environ.get("STATE_TTL_DAYS", "30") or 30)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=ttl_days)).isoformat()
    state["seen"] = {jid: ts for jid, ts in state["seen"].items() if ts >= cutoff}
    return state


def save_state(state: dict) -> None:
    state["last_run"] = datetime.now(timezone.utc).isoformat()
    STATE_FILE.write_text(json.dumps(state, indent=2, sort_keys=True))


# ---------- Filtering ----------

def in_quiet_hours() -> bool:
    spec = os.environ.get("QUIET_HOURS", "23-7").strip().lower()
    if spec in ("off", "none", "0", "false", ""):
        return False
    try:
        start_s, end_s = spec.split("-", 1)
        start_h, end_h = int(start_s), int(end_s)
    except ValueError:
        return False
    now_h = datetime.now(MT).hour
    if start_h == end_h:
        return False
    if start_h < end_h:
        return start_h <= now_h < end_h
    return now_h >= start_h or now_h < end_h  # wraps midnight


def passes_filters(job: dict) -> bool:
    min_pay = float(os.environ.get("MIN_PAY", "0") or 0)
    if min_pay > 0:
        pay_raw = job.get("totalPayRateMax") or job.get("totalPayRateMin")
        if pay_raw is not None:
            try:
                if float(pay_raw) < min_pay:
                    return False
            except (TypeError, ValueError):
                pass  # unparseable -> don't filter
    return True


# ---------- Formatting ----------

def _pay_str(j: dict) -> str:
    lo, hi, cur = j.get("totalPayRateMin"), j.get("totalPayRateMax"), j.get("currencyCode") or "CAD"
    if lo and hi and lo != hi:
        return f"${lo}-${hi} {cur}/hr"
    if lo or hi:
        return f"${lo or hi} {cur}/hr"
    return ""


def _apply_url(job_id: str) -> str:
    return f"{APPLY_BASE}?jobId={job_id}&locale=en-CA"


def _job_summary_line(j: dict, schedules: list[dict] | None = None) -> str:
    title = j.get("jobTitle") or "Amazon shift"
    loc = j.get("locationName") or j.get("city") or "Calgary area"
    pay = _pay_str(j)
    bits = [title, f"@ {loc}"]
    if pay:
        bits.append(f"({pay})")
    if schedules:
        s = schedules[0]
        sched_text = s.get("scheduleText") or s.get("scheduleBannerText")
        if sched_text:
            bits.append(f"- {sched_text}")
    return " ".join(bits)


def build_subject(enriched: list[tuple[dict, list[dict]]]) -> str:
    top = enriched[0]
    summary = _job_summary_line(*top)
    if len(enriched) == 1:
        return f"[Amazon Calgary] {summary}"
    return f"[Amazon Calgary] {summary} + {len(enriched) - 1} more"


def build_text(enriched: list[tuple[dict, list[dict]]]) -> str:
    lines = ["New Amazon Calgary shifts. Tap the link to apply now.\n"]
    for j, scheds in enriched:
        title = j.get("jobTitle") or "Amazon shift"
        loc = j.get("locationName") or j.get("city") or "Calgary area"
        pay = _pay_str(j)
        emp = j.get("employmentTypeL10N") or j.get("employmentType") or j.get("jobType") or ""
        lines.append(f"• {title}")
        lines.append(f"  Location: {loc}")
        if pay:
            lines.append(f"  Pay: {pay}")
        if emp:
            lines.append(f"  Type: {emp}")
        if scheds:
            for s in scheds[:3]:
                t = s.get("scheduleText") or s.get("scheduleBannerText") or ""
                hpw = s.get("hoursPerWeek")
                first = s.get("firstDayOnSite") or ""
                extra = f" ({hpw}h/wk)" if hpw else ""
                start = f" starts {first}" if first else ""
                if t or extra or start:
                    lines.append(f"  Schedule: {t}{extra}{start}")
            if len(scheds) > 3:
                lines.append(f"  + {len(scheds) - 3} more schedules")
        lines.append(f"  Apply: {_apply_url(j['jobId'])}")
        lines.append("")
    lines.append(
        f"Detected {datetime.now(MT).strftime('%a %b %d, %I:%M %p MT')}. "
        "Bot polls every 5 min — popular shifts go fast, apply ASAP."
    )
    return "\n".join(lines)


def build_html(enriched: list[tuple[dict, list[dict]]]) -> str:
    rows = []
    for j, scheds in enriched:
        title = j.get("jobTitle") or "Amazon shift"
        loc = j.get("locationName") or j.get("city") or "Calgary area"
        pay = _pay_str(j)
        emp = j.get("employmentTypeL10N") or j.get("employmentType") or j.get("jobType") or ""
        sched_html = ""
        if scheds:
            items = []
            for s in scheds[:3]:
                t = s.get("scheduleText") or s.get("scheduleBannerText") or ""
                hpw = s.get("hoursPerWeek")
                first = s.get("firstDayOnSite") or ""
                extra = f" ({hpw}h/wk)" if hpw else ""
                start = f" — starts {first}" if first else ""
                items.append(f"<li>{t}{extra}{start}</li>")
            sched_html = (
                "<div style='color:#555;font-size:13px;margin:6px 0 0 0'>"
                "<strong>Schedules:</strong><ul style='margin:4px 0 0 18px;padding:0'>"
                + "".join(items) + "</ul></div>"
            )
        rows.append(f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0"
  style="width:100%;max-width:560px;margin:0 0 18px 0;background:#fff;
         border:1px solid #e5e7eb;border-radius:10px;padding:18px;
         font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif">
  <tr><td>
    <div style="font-size:17px;font-weight:700;color:#111">{title}</div>
    <div style="font-size:14px;color:#374151;margin-top:4px">📍 {loc}</div>
    {('<div style="font-size:14px;color:#065f46;font-weight:600;margin-top:4px">💵 ' + pay + '</div>') if pay else ''}
    {('<div style="font-size:13px;color:#6b7280;margin-top:4px">' + emp + '</div>') if emp else ''}
    {sched_html}
    <div style="margin-top:14px">
      <a href="{_apply_url(j['jobId'])}" target="_blank"
        style="display:inline-block;background:#FF7A00;color:#fff;
               text-decoration:none;font-weight:700;padding:12px 22px;
               border-radius:8px;font-size:15px">
        Apply on Amazon →
      </a>
    </div>
  </td></tr>
</table>""")

    stamp = datetime.now(MT).strftime('%a %b %d, %I:%M %p MT')
    return f"""<!doctype html>
<html><body style="margin:0;padding:20px;background:#f3f4f6">
  <div style="max-width:560px;margin:0 auto">
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;
                font-size:13px;color:#6b7280;margin-bottom:14px">
      {len(enriched)} new Amazon shift{'s' if len(enriched) != 1 else ''} in Calgary
      — detected {stamp}
    </div>
    {''.join(rows)}
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;
                font-size:11px;color:#9ca3af;text-align:center;margin-top:8px">
      Popular shifts go in seconds. Apply ASAP.
    </div>
  </div>
</body></html>"""


# ---------- Notification channels ----------

def send_email(subject: str, text: str, html: str) -> bool:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return False
    try:
        port = int(os.environ.get("SMTP_PORT", "587") or 587)
    except ValueError:
        print("  email: SMTP_PORT not a number; skipping email")
        return False
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    to_addr = os.environ.get("NOTIFY_TO", "").strip()
    if not (user and password and to_addr):
        print("  email: SMTP_USER/SMTP_PASS/NOTIFY_TO not all set; skipping email")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = user
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=30) as s:
            s.ehlo()
            s.starttls()
            s.login(user, password)
            s.send_message(msg)
        print(f"  email: sent to {to_addr}")
        return True
    except (smtplib.SMTPException, OSError) as e:
        print(f"  email: FAILED — {e}", file=sys.stderr)
        return False


def send_telegram(enriched: list[tuple[dict, list[dict]]]) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not (token and chat):
        return False

    parts = [f"🚨 *{len(enriched)} new Amazon Calgary shift(s)*"]
    for j, scheds in enriched:
        title = (j.get("jobTitle") or "Amazon shift").replace("*", "")
        loc = (j.get("locationName") or j.get("city") or "Calgary area").replace("*", "")
        pay = _pay_str(j)
        line = f"\n*{title}*\n📍 {loc}"
        if pay:
            line += f"\n💵 {pay}"
        if scheds:
            s = scheds[0]
            t = (s.get("scheduleText") or s.get("scheduleBannerText") or "").replace("*", "")
            if t:
                line += f"\n🕐 {t}"
        line += f"\n[Apply now]({_apply_url(j['jobId'])})"
        parts.append(line)

    body = "\n".join(parts)
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
            print(f"  telegram: sent to chat {chat}")
            return True
        print(f"  telegram: FAILED — {r.status_code} {r.text[:200]}", file=sys.stderr)
        return False
    except requests.RequestException as e:
        print(f"  telegram: FAILED — {e}", file=sys.stderr)
        return False


# ---------- Main ----------

def main() -> int:
    started = time.time()
    print(f"=== run at {datetime.now(MT).isoformat()} ===")

    state = prune(load_state())
    jobs = fetch_jobs()
    current_ids = {j["jobId"] for j in jobs if j.get("jobId")}
    now_iso = datetime.now(timezone.utc).isoformat()

    # Cold start: never email on first run; baseline what's already listed.
    if not state.get("initialized"):
        for jid in current_ids:
            state["seen"][jid] = now_iso
        state["initialized"] = True
        save_state(state)
        print(
            f"COLD-START: baselined {len(current_ids)} existing jobs, no alert sent "
            f"({time.time() - started:.1f}s)"
        )
        return 0

    new_jobs = [
        j for j in jobs
        if j.get("jobId") and j["jobId"] not in state["seen"] and passes_filters(j)
    ]
    print(f"listed={len(current_ids)} new={len(new_jobs)} quiet={in_quiet_hours()}")

    if not new_jobs:
        for jid in current_ids:
            state["seen"].setdefault(jid, now_iso)
        save_state(state)
        print(f"no new jobs ({time.time() - started:.1f}s)")
        return 0

    if in_quiet_hours():
        # During quiet hours: record IDs as seen so we don't alert later for
        # jobs that have already filled. Only alert on jobs still listed
        # after quiet hours end.
        for jid in current_ids:
            state["seen"].setdefault(jid, now_iso)
        save_state(state)
        print(f"quiet hours — suppressed {len(new_jobs)} alert(s)")
        return 0

    # Enrich with schedule details (best-effort, capped)
    enriched: list[tuple[dict, list[dict]]] = []
    for j in new_jobs[:10]:
        scheds = fetch_schedules(j["jobId"])
        enriched.append((j, scheds))

    subject = build_subject(enriched)
    text = build_text(enriched)
    html = build_html(enriched)

    email_ok = send_email(subject, text, html)
    tg_ok = send_telegram(enriched)

    if not (email_ok or tg_ok):
        print(
            "ALERT FAILED on every channel — NOT saving state so next run retries",
            file=sys.stderr,
        )
        return 1

    for jid in current_ids:
        state["seen"].setdefault(jid, now_iso)
    save_state(state)
    print(
        f"alerted on {len(new_jobs)} job(s) "
        f"(email={email_ok}, telegram={tg_ok}, {time.time() - started:.1f}s)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
