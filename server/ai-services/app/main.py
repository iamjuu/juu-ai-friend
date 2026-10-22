from __future__ import annotations

import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import HOST, MAX_AUDIO_SECONDS, PORT
from app.services import stt, tts
from app.services.audio import AudioError, load_mono_16k


class SynthesizeBody(BaseModel):
    text: str = Field(..., min_length=1, max_length=800)
    voice: str | None = "Anjali"
    speaking_style: str | None = "friendly"
    description: str | None = None


def _load_models() -> None:
    try:
        stt.load_stt()
        print("STT ready:", stt.status())
    except Exception as exc:
        print("STT load failed:", exc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    thread = threading.Thread(target=_load_models, daemon=True)
    thread.start()
    yield


app = FastAPI(
    title="Juu Mowlee Speech Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5050", "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    stt_status = stt.status()
    tts_status = tts.status()
    ready = stt_status["ready"] or tts_status["ready"]
    return {
        "ok": ready,
        "status": "ok" if ready else "loading",
        "stt": stt_status,
        "tts": tts_status,
        "stt_ready": stt_status["ready"],
        "tts_ready": tts_status["ready"],
        "bind": f"{HOST}:{PORT}",
        "max_audio_seconds": MAX_AUDIO_SECONDS,
    }


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not stt.status()["ready"]:
        try:
            stt.load_stt()
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Speech recognition is not ready: {exc}") from exc

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file is too large.")

    try:
        audio, sample_rate = load_mono_16k(data)
        return stt.transcribe(audio, sample_rate)
    except AudioError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc


@app.post("/synthesize")
def synthesize(body: SynthesizeBody):
    if not tts.status()["ready"]:
        try:
            tts.load_tts()
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Voice generation is not ready: {exc}") from exc
    try:
        return tts.synthesize(
            text=body.text,
            voice=body.voice,
            speaking_style=body.speaking_style,
            description=body.description,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {exc}") from exc
