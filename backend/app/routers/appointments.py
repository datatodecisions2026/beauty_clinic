from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import date, time, timedelta, datetime
from typing import List
from app.database import get_db
from app.models import Appointment, Service, User
from app.schemas import AppointmentCreate, AppointmentAdminCreate, AppointmentUpdate, AppointmentOut
from app.auth import get_current_user, get_current_staff
from app.email_service import send_booking_confirmation, send_cancellation

router = APIRouter(prefix="/appointments", tags=["appointments"])

EXCLUDED_DAYS = {"Monday", "Wednesday", "Sunday"}
WORK_HOURS = list(range(9, 18))


def get_allowed_days(days_ahead: int = 14) -> List[str]:
    today = date.today()
    allowed = []
    for i in range(days_ahead):
        day = today + timedelta(days=i)
        if day.strftime("%A") not in EXCLUDED_DAYS:
            allowed.append(day.isoformat())
    return allowed


async def _booked_times(db: AsyncSession, service_id: int, day: date) -> List[time]:
    result = await db.execute(
        select(Appointment.time)
        .where(Appointment.service_id == service_id, Appointment.date == day)
        .where(Appointment.status != "Cancelled")
    )
    return [r[0] for r in result.all()]


@router.get("/available-days")
async def available_days():
    return {"days": get_allowed_days()}


@router.get("/available-times")
async def available_times(service_id: int, date: date, db: AsyncSession = Depends(get_db)):
    booked = await _booked_times(db, service_id, date)
    all_times = [datetime(2024, 1, 1, h, 0).time() for h in WORK_HOURS]
    available = [t.strftime("%H:%M") for t in all_times if t not in booked]
    return {"available_times": available}


@router.get("", response_model=List[AppointmentOut])
async def list_appointments(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Appointment).options(selectinload(Appointment.service), selectinload(Appointment.client))

    if not current_user.is_staff and not current_user.is_superuser:
        query = query.where(Appointment.client_id == current_user.id)

    query = query.order_by(Appointment.date.desc(), Appointment.time)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service_result = await db.execute(select(Service).where(Service.id == data.service_id))
    service = service_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    appointment = Appointment(client_id=current_user.id, service_id=data.service_id, date=data.date, time=data.time)
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.service), selectinload(Appointment.client))
        .where(Appointment.id == appointment.id)
    )
    appointment = result.scalar_one()
    send_booking_confirmation(
        current_user.email,
        current_user.first_name,
        service.servicetype,
        data.date.strftime("%b %d, %Y"),
        data.time.strftime("%I:%M %p"),
        appointment.status,
    )
    return appointment


@router.post("/admin", response_model=AppointmentOut, status_code=201)
async def admin_create_appointment(
    data: AppointmentAdminCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_staff),
):
    client_result = await db.execute(select(User).where(User.id == data.client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    service_result = await db.execute(select(Service).where(Service.id == data.service_id))
    service = service_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    appointment = Appointment(
        client_id=data.client_id, service_id=data.service_id, date=data.date, time=data.time,
        final_price=data.final_price,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.service), selectinload(Appointment.client))
        .where(Appointment.id == appointment.id)
    )
    appointment = result.scalar_one()
    send_booking_confirmation(
        client.email, client.first_name, service.servicetype,
        data.date.strftime("%b %d, %Y"), data.time.strftime("%I:%M %p"), appointment.status,
    )
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.service), selectinload(Appointment.client))
        .where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    fields = data.model_dump(exclude_unset=True)

    if fields.get("service_id") is not None:
        appointment.service_id = fields["service_id"]
    if fields.get("date") is not None:
        appointment.date = fields["date"]
    if fields.get("time") is not None:
        appointment.time = fields["time"]
    if fields.get("status") is not None:
        appointment.status = fields["status"]
    if "final_price" in fields:
        # Sent explicitly (including null) — null clears the override back to the service's list price.
        appointment.final_price = fields["final_price"]

    await db.commit()
    await db.refresh(appointment)
    send_booking_confirmation(
        appointment.client.email, appointment.client.first_name,
        appointment.service.servicetype,
        appointment.date.strftime("%b %d, %Y"), appointment.time.strftime("%I:%M %p"),
        appointment.status,
    )
    return appointment


@router.patch("/{appointment_id}/cancel", response_model=AppointmentOut)
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.service), selectinload(Appointment.client))
        .where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not current_user.is_staff and appointment.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    appointment.status = "Cancelled"
    await db.commit()
    await db.refresh(appointment)
    send_cancellation(
        appointment.client.email, appointment.client.first_name,
        appointment.service.servicetype,
        appointment.date.strftime("%b %d, %Y"), appointment.time.strftime("%I:%M %p"),
    )
    return appointment
