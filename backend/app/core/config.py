from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application config, loaded from environment variables / .env.

    Centralizing this in one place means the rest of the app never calls
    os.getenv() directly — it just imports `settings`.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./app.db"

    # The one designated AutoTrust company account. Any vehicle listed by
    # this account is auto-marked vetted — see Vehicle.is_vetted (phase 2).
    COMPANY_ACCOUNT_EMAIL: str = "company@autotrust.com"

    # Placeholder until a real key is generated at aistudio.google.com/apikey
    # and dropped into .env. app/core/gemini.py treats any failed call
    # (including an invalid/placeholder key) as best-effort and non-fatal.
    GEMINI_API_KEY: str = "replace-with-your-gemini-api-key"
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # "development" logs outgoing emails (including verification links) to the
    # server console when SMTP isn't configured. Set to "production" to stop that.
    APP_ENV: str = "development"
    # Where the website lives; used to build links in emails.
    FRONTEND_URL: str = "http://localhost:3100"

    # Outgoing email (SMTP). Leave SMTP_HOST empty to disable sending.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "AutoTrust <no-reply@autotrust.com>"
    SMTP_USE_TLS: bool = True
    EMAIL_VERIFICATION_TTL_HOURS: int = 24

    # Money. AutoTrust receives the buyer's transfer here, then pays the
    # seller their share. Orders are refused until these are filled in, so
    # buyers never see placeholder bank details.
    COMPANY_BANK_NAME: str = ""
    COMPANY_BANK_ACCOUNT_NUMBER: str = ""
    COMPANY_BANK_ACCOUNT_NAME: str = ""
    PLATFORM_FEE_RATE: float = 0.05
    PAYMENT_WINDOW_HOURS: int = 48
    # The currency prices are quoted in (listings are currently entered in USD).
    CURRENCY_CODE: str = "USD"

    # Cloudinary (image storage) — from the dashboard at cloudinary.com/console.
    # When all three are set, vehicle photos are stored there; otherwise they
    # go to local disk (development only — see app/core/storage.py).
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # AI advisor limits per rolling hour — every chat turn is a paid Gemini
    # call, and the endpoint is open to visitors without an account.
    ADVISOR_ANON_LIMIT_PER_HOUR: int = 15
    ADVISOR_USER_LIMIT_PER_HOUR: int = 60

    # Comma-separated list of origins the frontend is allowed to call the API
    # from. Vite's dev server defaults to 5173; 3000 covers other common
    # React dev setups.
    CORS_ORIGINS: str = (
        "http://localhost:3100,http://127.0.0.1:3100,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
