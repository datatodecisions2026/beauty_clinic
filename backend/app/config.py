from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    make_webhook_url: str = ""
    resend_api_key: str = ""
    resend_from: str = ""
    frontend_url: str = ""
    google_places_api_key: str = ""
    google_place_id: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
