import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import UserOut
from app.auth import get_current_staff, pwd_context
from app import hub

router = APIRouter(prefix="/users", tags=["users"])


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
