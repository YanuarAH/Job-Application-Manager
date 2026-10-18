from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import assistant, auth, jobs, profile

app = FastAPI(
    title="Job Application Manager API",
    description="API for managing job applications and job analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["system"])
def root():
    return {
        "message": "Job Application Manager API",
        "status": "running",
    }


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "healthy"}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(assistant.router)
