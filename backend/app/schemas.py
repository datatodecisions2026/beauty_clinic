from pydantic import BaseModel, EmailStr
from datetime import date, time, datetime
from typing import Optional


# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# --- User ---
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    password: str
    birth_date: Optional[date] = None
    country: Optional[str] = None
    state: Optional[str] = None
    gender: Optional[str] = "Female"
    phone_number: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    first_name: str
    last_name: str
    country: Optional[str]
    state: Optional[str]
    gender: Optional[str]
    phone_number: Optional[str]
    is_staff: bool
    is_superuser: bool

    class Config:
        from_attributes = True


# --- Service ---
class ServiceCreate(BaseModel):
    servicetype: str
    price: float


class ServiceUpdate(BaseModel):
    servicetype: Optional[str] = None
    price: Optional[float] = None


class ServiceOut(BaseModel):
    id: int
    servicetype: str
    price: float

    class Config:
        from_attributes = True


# --- Appointment ---
class AppointmentCreate(BaseModel):
    service_id: int
    date: date
    time: time


class AppointmentAdminCreate(BaseModel):
    client_id: int
    service_id: int
    date: date
    time: time
    final_price: Optional[float] = None


class AppointmentUpdate(BaseModel):
    service_id: Optional[int] = None
    date: Optional[date] = None
    time: Optional[time] = None
    status: Optional[str] = None
    # Explicit null clears the override and falls back to the service's list price.
    final_price: Optional[float] = None


class AppointmentOut(BaseModel):
    id: int
    service: ServiceOut
    client: UserOut
    date: date
    time: time
    status: str
    final_price: Optional[float] = None

    class Config:
        from_attributes = True


# --- Review ---
class ReviewCreate(BaseModel):
    comment: str
    rating: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    comment: str
    rating: Optional[str]
    date: datetime
    user: UserOut

    class Config:
        from_attributes = True
