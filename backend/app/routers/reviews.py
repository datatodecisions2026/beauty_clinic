import time
import logging

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.config import settings
from app.models import Review
from app.schemas import ReviewCreate, ReviewOut
from app.auth import get_current_user, get_current_staff
from app.models import User

router = APIRouter(prefix="/reviews", tags=["reviews"])

logger = logging.getLogger("uvicorn.error")

# --- Google Places reviews (cached) ---------------------------------------------
_GOOGLE_CACHE: dict = {"data": None, "ts": 0.0}
_GOOGLE_TTL = 60 * 60 * 24  # 24h — also keeps us well within Google's caching policy
_GOOGLE_ENDPOINT = "https://places.googleapis.com/v1/places/{place_id}"
_GOOGLE_FIELDS = (
    "id,displayName,rating,userRatingCount,googleMapsUri,"
    "reviews.rating,reviews.text,reviews.originalText,"
    "reviews.relativePublishTimeDescription,reviews.publishTime,"
    "reviews.authorAttribution"
)

_EMPTY = {"reviews": [], "rating": None, "total": 0, "source_url": None}


def _fetch_google_reviews() -> dict:
    key = settings.google_places_api_key
    place_id = settings.google_place_id
    if not key or not place_id:
        return _EMPTY

    try:
        resp = requests.get(
            _GOOGLE_ENDPOINT.format(place_id=place_id),
            headers={"X-Goog-Api-Key": key, "X-Goog-FieldMask": _GOOGLE_FIELDS},
            params={"languageCode": "en"},
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:  # network error, quota, bad key, etc.
        logger.warning("Google Places reviews fetch failed: %s", exc)
        return _EMPTY

    reviews = []
    for r in data.get("reviews", []):
        author = r.get("authorAttribution") or {}
        text = (r.get("text") or r.get("originalText") or {}).get("text", "").strip()
        if not text:
            continue
        reviews.append(
            {
                "author": author.get("displayName") or "Google user",
                "photo": author.get("photoUri"),
                "author_url": author.get("uri"),
                "rating": r.get("rating") or 5,
                "text": text,
                "relative_time": r.get("relativePublishTimeDescription"),
                "publish_time": r.get("publishTime"),
                "uri": author.get("uri") or data.get("googleMapsUri"),
            }
        )

    return {
        "reviews": reviews,
        "rating": data.get("rating"),
        "total": data.get("userRatingCount"),
        "source_url": data.get("googleMapsUri"),
    }


@router.get("/google")
async def google_reviews(refresh: bool = False):
    """Cached Google Places reviews for the public site. Never errors — returns an
    empty list if the key is missing or Google is unreachable, so the frontend can
    fall back to its embedded widget. Good payloads are cached 24h; empty ones only
    5 min, so adding the key later takes effect without a restart."""
    now = time.time()
    cached = _GOOGLE_CACHE["data"]
    ttl = _GOOGLE_TTL if (cached and cached["reviews"]) else 300
    if refresh or cached is None or now - _GOOGLE_CACHE["ts"] > ttl:
        fresh = await run_in_threadpool(_fetch_google_reviews)
        # never overwrite a good payload with an empty one caused by a transient error
        if fresh["reviews"] or not (cached and cached["reviews"]):
            _GOOGLE_CACHE["data"] = fresh
            _GOOGLE_CACHE["ts"] = now
    return _GOOGLE_CACHE["data"]


@router.get("", response_model=List[ReviewOut])
async def list_reviews(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review).options(selectinload(Review.user)).order_by(Review.date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = Review(user_id=current_user.id, comment=data.comment, rating=data.rating)
    db.add(review)
    await db.commit()
    await db.refresh(review)

    result = await db.execute(
        select(Review).options(selectinload(Review.user)).where(Review.id == review.id)
    )
    return result.scalar_one()


@router.delete("/{review_id}", status_code=204)
async def delete_review(review_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.delete(review)
    await db.commit()
