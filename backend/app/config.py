from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "sqlite+aiosqlite:///./architect_ai.db"
    frontend_url: str = "http://localhost:5173"
    model_primary: str = "claude-sonnet-4-20250514"
    model_fast: str = "claude-haiku-4-5"

    model_config = {
        "env_file": ".env",
        "protected_namespaces": ("settings_",)
    }

settings = Settings()
