#!/usr/bin/env python3
"""Amazon Calgary shift availability notifier.

Polls the public hiring.amazon.ca job-search endpoint for warehouse /
delivery shifts within ~50 km of Calgary and emails when a job ID
appears that wasn't on the previous run. Does NOT auto-apply.

Required env vars:
  SMTP_HOST       e.g. smtp.gmail.com
  SMTP_PORT       e.g. 587
  SMTP_USER       sender address (Gmail account)
  SMTP_PASS       Gmail App Password (not your real password)
  NOTIFY_TO       recipient address

Optional env vars:
  BEARER_TOKEN    Authorization: Bearer ... value, if Amazon's anonymous
                  endpoint starts requiring one. Grab from DevTools >
                  Network on hiring.amazon.ca.
  SEARCH_RADIUS_KM  default 50
"""
from __future__ import annotations

import json
import os
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path

import requests

STATE_FILE = Path(__file__).parent / "seen_jobs.json"
GRAPHQL_URL = "https://hiring.amazon.ca/app-api/career-site/graphql"

# Calgary, AB
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
      employmentTypeL10N
      jobType
      jobTypeL10N
    }
  }
}
""".strip()


def fetch_jobs() -> list[dict]:
    radius = int(os.environ.get("SEARCH_RADIUS_KM", "50"))
    payload = {
        "operationName": "searchJobCardsByLocation",
        "variables": {
            "searchJobRequest": {
                "locale": "en-CA",
                "country": "Canada",
                "keyWords": "",
                "equalFilters": [],
                "containFilters": [
                    {"key": "isPrivateSchedule", "val": ["false"]}
                ],
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
        },
        "query": SEARCH_QUERY,
    }
    headers = {
        "content-type": "application/json",
        "accept": "application/json",
        "country": "Canada",
        "iscanary": "false",
        "origin": "https://hiring.amazon.ca",
        "referer": "https://hiring.amazon.ca/app",
        "user-agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    }
    bearer = os.environ.get("BEARER_TOKEN", "").strip()
    if bearer:
        headers["authorization"] = (
            bearer if bearer.lower().startswith("bearer ") else f"Bearer {bearer}"
        )

    r = requests.post(GRAPHQL_URL, json=payload, headers=headers, timeout=30)
    if r.status_code in (401, 403):
        raise SystemExit(
            f"Amazon rejected the request ({r.status_code}). "
            "You probably need to set BEARER_TOKEN — grab the "
            "Authorization header from DevTools > Network on "
            "hiring.amazon.ca and store it as a repo secret."
        )
    r.raise_for_status()
    data = r.json()
    cards = (
        data.get("data", {})
        .get("searchJobCardsByLocation", {})
        .get("jobCards")
        or []
    )
    return cards


def load_seen() -> set[str]:
    if not STATE_FILE.exists():
        return set()
    try:
        return set(json.loads(STATE_FILE.read_text()))
    except (json.JSONDecodeError, OSError):
        return set()


def save_seen(ids: set[str]) -> None:
    STATE_FILE.write_text(json.dumps(sorted(ids)))


def format_jobs(jobs: list[dict]) -> str:
    lines = [
        "New Amazon Calgary shifts are listed. Apply at "
        "https://hiring.amazon.ca/app/#/jobSearch\n"
    ]
    for j in jobs:
        title = j.get("jobTitle") or "(no title)"
        loc = j.get("locationName") or j.get("city") or ""
        pay_min = j.get("totalPayRateMin")
        pay_max = j.get("totalPayRateMax")
        cur = j.get("currencyCode") or ""
        sched = j.get("scheduleCount")
        emp = j.get("employmentTypeL10N") or j.get("jobType") or ""

        pay = ""
        if pay_min and pay_max:
            pay = f" — ${pay_min}-${pay_max} {cur}/hr"
        elif pay_min:
            pay = f" — ${pay_min} {cur}/hr"

        lines.append(f"• {title} @ {loc}{pay}  [{emp}, {sched} schedule(s)]")
        lines.append(
            "  https://hiring.amazon.ca/app/#/jobDetail?"
            f"jobId={j.get('jobId')}&locale=en-CA"
        )
        lines.append("")
    return "\n".join(lines)


def send_email(new_jobs: list[dict]) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASS"]
    to_addr = os.environ["NOTIFY_TO"]

    msg = EmailMessage()
    msg["From"] = user
    msg["To"] = to_addr
    msg["Subject"] = f"[Amazon Calgary] {len(new_jobs)} new shift(s) available"
    msg.set_content(format_jobs(new_jobs))

    with smtplib.SMTP(host, port, timeout=30) as s:
        s.starttls()
        s.login(user, password)
        s.send_message(msg)


def main() -> None:
    jobs = fetch_jobs()
    current_ids = {j["jobId"] for j in jobs if j.get("jobId")}
    seen = load_seen()

    # Cold start: record current set so the first run doesn't email
    # every existing job. From the next run on, only new IDs trigger.
    if not seen:
        print(
            f"Cold start: recording {len(current_ids)} existing jobs "
            "as seen, no email sent."
        )
        save_seen(current_ids)
        return

    new_jobs = [j for j in jobs if j["jobId"] not in seen]
    print(f"{len(current_ids)} jobs listed, {len(new_jobs)} new.")

    if new_jobs:
        send_email(new_jobs)
        print(f"Emailed {len(new_jobs)} new job(s) to {os.environ['NOTIFY_TO']}.")

    # Union: keeps IDs of jobs that briefly disappear so they don't
    # re-notify when they pop back up.
    save_seen(seen | current_ids)


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException as e:
        print(f"Network error: {e}", file=sys.stderr)
        sys.exit(1)
