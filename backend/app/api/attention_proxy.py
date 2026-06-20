"""Proxy attention-service routes through the main API (single public URL for Vercel + tunnels)."""
import os

import httpx
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException

router = APIRouter()

ATTENTION_BASE = os.getenv("ATTENTION_SERVICE_URL", "http://127.0.0.1:8001").rstrip("/")
VOICE_TIMEOUT = float(os.getenv("ATTENTION_VOICE_TIMEOUT", "120"))


async def _forward_multipart(
    path: str,
    form_data: dict,
    files: dict,
    authorization: str | None,
) -> dict:
    headers = {}
    if authorization:
        headers["Authorization"] = authorization

    try:
        async with httpx.AsyncClient(timeout=VOICE_TIMEOUT) as client:
            response = await client.post(
                f"{ATTENTION_BASE}{path}",
                data=form_data,
                files=files,
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Attention service unavailable: {exc}",
        ) from exc

    if response.status_code >= 400:
        detail = response.text
        try:
            detail = response.json().get("detail", detail)
        except Exception:
            pass
        raise HTTPException(status_code=response.status_code, detail=detail)

    return response.json()


@router.post("/voice/register")
async def proxy_register_voice(
    candidate_id: str = Form(...),
    audio: UploadFile = File(...),
    authorization: str | None = Header(None),
):
    audio_bytes = await audio.read()
    return await _forward_multipart(
        "/voice/register",
        {"candidate_id": candidate_id},
        {
            "audio": (
                audio.filename or "voice.webm",
                audio_bytes,
                audio.content_type or "audio/webm",
            )
        },
        authorization,
    )


@router.post("/voice/verify")
async def proxy_verify_voice(
    candidate_id: str = Form(...),
    audio: UploadFile = File(...),
    authorization: str | None = Header(None),
):
    audio_bytes = await audio.read()
    return await _forward_multipart(
        "/voice/verify",
        {"candidate_id": candidate_id},
        {
            "audio": (
                audio.filename or "voice.webm",
                audio_bytes,
                audio.content_type or "audio/webm",
            )
        },
        authorization,
    )


@router.post("/attention/analyze")
async def proxy_analyze_attention(
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ATTENTION_BASE}/attention/analyze",
                files={
                    "file": (
                        file.filename or "frame.jpg",
                        file_bytes,
                        file.content_type or "image/jpeg",
                    )
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Attention service unavailable: {exc}",
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()
