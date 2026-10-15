
from fastapi import FastAPI

app = FastAPI(
    title="Job Application Manager API",
    description="Backend API for managing job applications and AI-powered job analysis.",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "Job Application Manager API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
