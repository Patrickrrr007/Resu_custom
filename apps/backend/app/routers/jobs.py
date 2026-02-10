"""Job description management endpoints."""

import logging

from fastapi import APIRouter, HTTPException

from app.database import db
from app.schemas import (
    JobUploadRequest,
    JobUploadResponse,
    JobUploadFromUrlRequest,
)
from app.services.job_extract import extract_job_from_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/upload-from-url", response_model=JobUploadResponse)
async def upload_job_from_url(
    request: JobUploadFromUrlRequest,
) -> JobUploadResponse:
    """Fetch a job posting URL, extract job description, and create a job.

    Returns job_id for use with resume improve/preview endpoints.
    """
    url = (request.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Job URL is required")
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="URL must start with http:// or https://",
        )

    try:
        content = await extract_job_from_url(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if len(content) < 50:
        raise HTTPException(
            status_code=400,
            detail="Could not extract enough job description from the URL. Please paste the job description instead.",
        )

    job = db.create_job(
        content=content,
        resume_id=request.resume_id,
    )
    job_id = job["job_id"]

    return JobUploadResponse(
        message="Job description extracted and stored",
        job_id=[job_id],
        request={
            "url": request.url,
            "resume_id": request.resume_id,
        },
    )


@router.post("/upload", response_model=JobUploadResponse)
async def upload_job_descriptions(request: JobUploadRequest) -> JobUploadResponse:
    """Upload one or more job descriptions.

    Stores the raw text for later use in resume tailoring.
    Returns an array of job_ids corresponding to the input array.
    """
    if not request.job_descriptions:
        raise HTTPException(status_code=400, detail="No job descriptions provided")

    job_ids = []
    for jd in request.job_descriptions:
        if not jd.strip():
            raise HTTPException(status_code=400, detail="Empty job description")

        job = db.create_job(
            content=jd.strip(),
            resume_id=request.resume_id,
        )
        job_ids.append(job["job_id"])

    return JobUploadResponse(
        message="data successfully processed",
        job_id=job_ids,
        request={
            "job_descriptions": request.job_descriptions,
            "resume_id": request.resume_id,
        },
    )


@router.get("/{job_id}")
async def get_job(job_id: str) -> dict:
    """Get job description by ID."""
    job = db.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job
