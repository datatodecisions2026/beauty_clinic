from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.routers import auth, appointments, services, reviews, users

app = FastAPI(title="Beauty Clinic API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://marynassifchbat.com",
        "http://www.marynassifchbat.com",
        "https://www.marynassifchbat.com",
        "https://beautyclinic-ormax172002-5199s-projects.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(appointments.router)
app.include_router(services.router)
app.include_router(reviews.router)
app.include_router(users.router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all only adds new tables, not new columns on existing ones —
        # patch appointments.final_price in for deployments that predate it.
        await conn.execute(text(
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS final_price NUMERIC(10, 2)"
        ))


@app.get("/health")
async def health():
    return {"status": "ok"}
