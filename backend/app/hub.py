"""Customer Hub adapter (central customer identity).

Disabled (no-op) unless HUB_URL and HUB_HMAC_SECRET are set. Never raises: the clinic must not depend on the Hub.
Fire-and-forget on a daemon thread, 2 attempts, no durable outbox — gaps are healed by re-running the idempotent
Hub backfill (ponytail: add an outbox only if missed events turn out to matter).

Privacy: appointment/service details are health-adjacent and are deliberately NOT sent — only that a booking happened.
"""
import hashlib
import hmac
import json
import threading
import time
import uuid
from datetime import datetime, timezone

import requests

from app.config import settings


def sign(secret: str, ts: str, request_id: str, raw_body: str) -> str:
    body_hash = hashlib.sha256(raw_body.encode()).hexdigest()
    return hmac.new(secret.encode(), f"{ts}.{request_id}.{body_hash}".encode(), hashlib.sha256).hexdigest()


def to_body(user, event_type: str, data: dict | None = None) -> str:
    return json.dumps({
        "event_type": event_type,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "external_customer_id": str(user.id),
        "customer": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone_number,
            "date_of_birth": user.birth_date.isoformat() if user.birth_date else None,
            "country": user.country,
            # gender is not sent: the column defaults to "Female", so it is not a real signal.
        },
        "data": data or {},
    })


def _post(body: str) -> None:
    request_id = str(uuid.uuid4())  # reused across retries so the Hub dedupes
    for attempt in (1, 2):
        try:
            ts = str(int(time.time()))
            r = requests.post(
                f"{settings.hub_url}/v1/events",
                data=body.encode(),
                headers={
                    "content-type": "application/json",
                    "x-site-id": "beauty-clinic",
                    "x-request-id": request_id,
                    "x-request-timestamp": ts,
                    "x-signature": sign(settings.hub_hmac_secret, ts, request_id, body),
                },
                timeout=3,
            )
            if r.ok:
                return
            if r.status_code < 500:  # 4xx won't improve on retry
                print(f"[hub] rejected ({r.status_code})")
                return
        except Exception as e:  # noqa: BLE001 - must never propagate
            if attempt == 2:
                print(f"[hub] failed: {e}")
        time.sleep(0.5)


def emit(user, event_type: str, data: dict | None = None) -> None:
    if not settings.hub_url or not settings.hub_hmac_secret:
        return
    try:
        body = to_body(user, event_type, data)  # built here, while the ORM object is loaded
        threading.Thread(target=_post, args=(body,), daemon=True).start()
    except Exception as e:  # noqa: BLE001
        print(f"[hub] emit failed: {e}")


# ─── WhatsApp consent ────────────────────────────────────────────────────────
# One checkbox covers "special offers & birthday wishes" -> these Hub purposes, scoped to this brand.
CONSENT_PURPOSES = ["promotions", "birthday", "gifting"]
CONSENT_VERSION = "2026-10-v1"
CONSENT_WORDING = (
    "Remember my moments (special offers & birthday wishes). Gentle, occasional messages from Beauty Clinic "
    "on WhatsApp, never about your treatments. Reply STOP anytime."
)


def consent(user, granted: bool, source: str) -> None:
    emit(user, "customer.opted_in" if granted else "customer.opted_out", {
        "channel": "whatsapp",
        "purposes": CONSENT_PURPOSES,
        "consent_version": CONSENT_VERSION,
        "source": source,
        "evidence": CONSENT_WORDING if granted else "withdrawn in account preferences",
    })


def whatsapp_consent(customer_id) -> bool | None:
    """True/False from the Hub, or None when the Hub is off/unreachable (the UI then hides the toggle). Blocking: call via a thread."""
    if not settings.hub_url or not settings.hub_hmac_secret:
        return None
    try:
        request_id = str(uuid.uuid4())
        ts = str(int(time.time()))
        r = requests.get(
            f"{settings.hub_url}/v1/consent/{customer_id}",
            headers={
                "x-site-id": "beauty-clinic",
                "x-request-id": request_id,
                "x-request-timestamp": ts,
                "x-signature": sign(settings.hub_hmac_secret, ts, request_id, ""),
            },
            timeout=3,
        )
        return bool(r.json().get("whatsapp")) if r.ok else None
    except Exception:  # noqa: BLE001
        return None
