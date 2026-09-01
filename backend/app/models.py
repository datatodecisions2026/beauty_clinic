from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Numeric, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    birth_date = Column(Date, nullable=True)
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    gender = Column(String, default="Female")
    phone_number = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_staff = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)

    appointments = relationship("Appointment", back_populates="client")
    reviews = relationship("Review", back_populates="user")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    servicetype = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    appointments = relationship("Appointment", back_populates="service")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(String, default="Scheduled")
    # Actual price agreed with the client for this appointment. Falls back to
    # service.price when null — set by the admin when it differs from the list price.
    final_price = Column(Numeric(10, 2), nullable=True)

    client = relationship("User", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(String, nullable=False)
    rating = Column(String, nullable=True)
    date = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reviews")
