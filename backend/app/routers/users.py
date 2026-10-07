import asyncio
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import UserOut
from app.auth import get_current_staff, get_current_user, pwd_context
from app import hub

router = APIRouter(prefix="/users", tags=["users"])


# Consent lives in the Customer Hub (single source of truth); the clinic only relays the client's choice.
@router.get("/me/preferences")
async def get_preferences(current_user: User = Depends(get_current_user)):
    whatsapp = await asyncio.to_thread(hub.whatsapp_consent, current_user.id)
    return {
        "available": whatsapp is not None,
        "whatsapp": whatsapp is True,
        "has_phone": bool(current_user.phone_number),
    }


@router.put("/me/preferences")
async def set_preferences(data: dict, current_user: User = Depends(get_current_user)):
    whatsapp = data.get("whatsapp")
    if not isinstance(whatsapp, bool):
        raise HTTPException(status_code=422, detail="whatsapp must be true or false")
    if whatsapp and not current_user.phone_number:
        raise HTTPException(status_code=422, detail="Add a phone number first")
    if not hub.settings.hub_url:
        raise HTTPException(status_code=503, detail="Preferences are temporarily unavailable")
    hub.consent(current_user, whatsapp, "account-preferences")
    return {"available": True, "whatsapp": whatsapp, "has_phone": bool(current_user.phone_number)}


@router.get("", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(get_current_staff)):
    result = await db.execute(select(User).where(User.is_superuser == False))
    return result.scalars().all()


@router.post("/admin", response_model=UserOut, status_code=201)
async def admin_create_client(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    """Create a walk-in client without requiring them to register themselves."""
    email = data.get("email", "").strip().lower()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    phone_number = data.get("phone_number", "").strip() or None

    if not email or not first_name or not last_name:
        raise HTTPException(status_code=422, detail="first_name, last_name and email are required")

    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A client with this email already exists")

    # derive a unique username from the name
    base = f"{first_name.lower()}.{last_name.lower()}".replace(" ", "")
    username = base
    suffix = 1
    while True:
        taken = await db.execute(select(User).where(User.username == username))
        if not taken.scalar_one_or_none():
            break
        username = f"{base}{suffix}"
        suffix += 1

    user = User(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
        phone_number=phone_number,
        hashed_password=pwd_context.hash(secrets.token_urlsafe(16)),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    hub.emit(user, "customer.created")
    return user
