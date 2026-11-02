import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from analytics import create_analytics_router  # noqa: E402  (needs env loaded first)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# tz_aware: analytics compares timestamps across timezones; keep everything UTC-aware.
client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
db = client[os.environ["DB_NAME"]]

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)  # no public API explorer
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "AKASH.EXE backend online"}


analytics_router = create_analytics_router(db)
api_router.include_router(analytics_router)
app.include_router(api_router)

# Only the configured frontend origins may call the API from a browser. No cookies are used,
# so credentials stay off. (Events are sent as simple requests and need no CORS preflight.)
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api/admin"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.on_event("startup")
async def startup():
    try:
        await analytics_router.ensure_indexes()
        logger.info("Analytics indexes ready (retention %s days)", os.environ.get("ANALYTICS_RETENTION_DAYS", "180"))
    except Exception as e:  # database down at boot: the app keeps serving, analytics retries on next boot
        logger.error("Analytics index setup failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
