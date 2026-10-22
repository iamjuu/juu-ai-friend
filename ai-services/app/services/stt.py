from __future__ import annotations

import threading

import numpy as np

from app.config import STT_BACKEND, STT_MODEL

_lock = threading.Lock()
_state = {
    "ready": False,
    "backend": STT_BACKEND,
    "model": STT_MODEL,
    "error": None,
    "engine": None,
}


def status() -> dict:
    return {
        "ready": _state["ready"],
        "backend": _state["backend"],
        "model": _state["model"],
        "error": _state["error"],
    }


def load_stt() -> None:
    with _lock:
        if _state["ready"]:
            return
        backend = STT_BACKEND.lower()
        try:
            if backend == "indicconformer":
                _state["engine"] = _load_indicconformer()
                _state["backend"] = "indicconformer"
            else:
                _state["engine"] = _load_whisper()
                _state["backend"] = "whisper"
            _state["ready"] = True
            _state["error"] = None
        except Exception as exc:
            _state["ready"] = False
            _state["error"] = str(exc)
            raise


def _load_whisper():
    from faster_whisper import WhisperModel

    return WhisperModel(STT_MODEL, device="cpu", compute_type="int8")


def _load_indicconformer():
    import torch
    import torchaudio
    from transformers import AutoModel

    model = AutoModel.from_pretrained(
        "ai4bharat/indic-conformer-600m-multilingual",
        trust_remote_code=True,
    )
    model.eval()
    return {"kind": "indicconformer", "model": model, "torchaudio": torchaudio, "torch": torch}


def transcribe(audio: np.ndarray, sample_rate: int) -> dict:
    if not _state["ready"]:
        load_stt()
    backend = _state["backend"]
    if backend == "whisper":
        segments, info = _state["engine"].transcribe(
            audio,
            language="ml",
            beam_size=5,
            vad_filter=True,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": text,
            "language": getattr(info, "language", "ml"),
            "duration": float(audio.size / sample_rate),
            "backend": "faster-whisper",
            "model": STT_MODEL,
        }

    bundle = _state["engine"]
    torch = bundle["torch"]
    wav = torch.from_numpy(audio).unsqueeze(0)
    if sample_rate != 16000:
        wav = bundle["torchaudio"].functional.resample(wav, sample_rate, 16000)
    with torch.inference_mode():
        text = bundle["model"](wav, "ml", "ctc")
    if isinstance(text, (list, tuple)):
        text = text[0]
    return {
        "text": str(text).strip(),
        "language": "ml",
        "duration": float(audio.size / sample_rate),
        "backend": "indicconformer",
        "model": "ai4bharat/indic-conformer-600m-multilingual",
    }
