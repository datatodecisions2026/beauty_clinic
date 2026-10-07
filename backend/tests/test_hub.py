"""Run: DATABASE_URL=x SECRET_KEY=x python -m pytest tests  (needs pydantic-settings, requests)."""
import json
import os
from datetime import date
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
os.environ.setdefault("SECRET_KEY", "x")

from app import hub  # noqa: E402


def test_signature_matches_the_hub_reference_vector():
    # Vector produced by the Hub's own TypeScript sign() — both sides must agree byte for byte.
    assert hub.sign("s3cret", "1700000000", "req-1", '{"a":1}') == \
        "18257e5fa8154c1d052269212185a458651f2dd3cb582ba4ff677ecce00d96db"


def test_body_maps_user_and_omits_gender_and_service_details():
    user = SimpleNamespace(id=7, first_name="Jane", last_name="Doe", email="jane@x.com",
                           phone_number="03 123 456", birth_date=date(1990, 4, 2), country="Lebanon", gender="Female")
    body = json.loads(hub.to_body(user, "customer.purchase_created", {"kind": "appointment", "date": "2026-10-10"}))
    assert body["external_customer_id"] == "7"
    assert body["customer"]["date_of_birth"] == "1990-04-02"
    assert "gender" not in body["customer"]
    assert body["data"] == {"kind": "appointment", "date": "2026-10-10"}


def test_emit_is_a_noop_when_unconfigured(monkeypatch):
    called = []
    monkeypatch.setattr(hub.threading, "Thread", lambda *a, **k: called.append(1))
    monkeypatch.setattr(hub.settings, "hub_url", "")
    hub.emit(SimpleNamespace(), "customer.created")  # would raise on a bare namespace if it tried to build a body
    assert not called


def test_consent_helpers_are_inert_when_unconfigured(monkeypatch):
    monkeypatch.setattr(hub.settings, "hub_url", "")
    assert hub.whatsapp_consent(7) is None
    hub.consent(SimpleNamespace(), True, "signup-form")  # would raise on a bare namespace if it tried to build a body
