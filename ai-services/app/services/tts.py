from __future__ import annotations

import base64
import io
import threading

import numpy as np
import soundfile as sf

from app.config import TTS_BACKEND, TTS_FALLBACK_MODEL, TTS_MODEL, TTS_VOICE

_lock = threading.Lock()
_state = {
    "ready": False,
    "backend": None,
    "model_name": None,
    "error": None,
    "expressive": False,
    "engine": None,
}

STYLE_DESCRIPTIONS = {
    "caring": "{voice}'s voice is gentle, caring, and conversational. She speaks slowly with warmth, natural pauses, and a close, very clear recording with no background noise.",
    "calm": "{voice} speaks in a calm, soothing tone at a slow, steady pace. The voice is soft, close, and captured in very clear audio with no background noise.",
    "happy": "{voice} speaks with a happy, cheerful, slightly high-pitched voice at a natural pace. The recording is very clear, close, and expressive.",
    "excited": "{voice} speaks with an excited, energetic tone, a slightly faster pace, and bright expressiveness. The recording is very clear and close with no background noise.",
    "sympathetic": "{voice} speaks in a sympathetic, warm tone with a slower pace and gentle pauses. The recording is very clear, close, and free of background noise.",
    "friendly": "{voice} speaks in a friendly, playful, conversational tone with a moderate pace and natural pitch. The recording is of very high quality, close, and clear.",
    "reassuring": "{voice} speaks in a reassuring, steady, and kind tone at a moderate-to-slow pace. The voice is close, very clear, and without background noise.",
    "neutral": "{voice} speaks with a high pitch at a normal pace in a clear, close-sounding environment. The neutral tone is captured with excellent audio quality.",
}


def status() -> dict:
    return {
        "ready": _state["ready"],
        "backend": _state["backend"],
        "model": _state["model_name"],
        "expressive": _state["expressive"],
        "error": _state["error"],
    }


def load_tts() -> None:
    with _lock:
        if _state["ready"]:
            return
        errors = []
        wanted = TTS_BACKEND.lower()
        if wanted != "mms":
            try:
                _state["engine"] = _load_parler()
                _state["backend"] = "parler"
                _state["model_name"] = TTS_MODEL
                _state["expressive"] = True
                _state["ready"] = True
                _state["error"] = None
                return
            except Exception as exc:
                errors.append(f"parler: {exc}")
        try:
            _state["engine"] = _load_mms()
            _state["backend"] = "mms"
            _state["model_name"] = TTS_FALLBACK_MODEL
            _state["expressive"] = False
            _state["ready"] = True
            _state["error"] = "; ".join(errors) if errors else None
        except Exception as exc:
            _state["ready"] = False
            _state["error"] = "; ".join(errors + [f"mms: {exc}"])
            raise RuntimeError(_state["error"]) from exc


def _pick_device():
    import torch

    from app.config import ALLOW_GPU, DEVICE

    if DEVICE == "cpu" or not ALLOW_GPU:
        return "cpu"
    if DEVICE == "cuda" and torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _load_parler():
    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer

    device = _pick_device()
    model = ParlerTTSForConditionalGeneration.from_pretrained(TTS_MODEL).to(device)
    tokenizer = AutoTokenizer.from_pretrained(TTS_MODEL)
    description_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    model.eval()
    return {
        "kind": "parler",
        "model": model,
        "tokenizer": tokenizer,
        "description_tokenizer": description_tokenizer,
        "device": device,
        "torch": torch,
    }


def _load_mms():
    import torch
    from transformers import AutoTokenizer, VitsModel

    device = _pick_device()
    model = VitsModel.from_pretrained(TTS_FALLBACK_MODEL).to(device)
    tokenizer = AutoTokenizer.from_pretrained(TTS_FALLBACK_MODEL)
    model.eval()
    return {
        "kind": "mms",
        "model": model,
        "tokenizer": tokenizer,
        "device": device,
        "torch": torch,
    }


def _wav_base64(audio: np.ndarray, sample_rate: int) -> str:
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format="WAV")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def synthesize(text: str, voice: str | None = None, speaking_style: str | None = None, description: str | None = None) -> dict:
    if not text or not text.strip():
        raise ValueError("Text is empty.")
    if not _state["ready"]:
        load_tts()

    voice_name = voice or TTS_VOICE
    style = speaking_style or "friendly"
    engine = _state["engine"]
    torch = engine["torch"]
    device = engine["device"]

    if engine["kind"] == "parler":
        caption = description or STYLE_DESCRIPTIONS.get(style, STYLE_DESCRIPTIONS["friendly"]).format(voice=voice_name)
        desc_ids = engine["description_tokenizer"](caption, return_tensors="pt").to(device)
        prompt_ids = engine["tokenizer"](text.strip(), return_tensors="pt").to(device)
        with torch.inference_mode():
            generation = engine["model"].generate(
                input_ids=desc_ids.input_ids,
                attention_mask=desc_ids.attention_mask,
                prompt_input_ids=prompt_ids.input_ids,
                prompt_attention_mask=prompt_ids.attention_mask,
            )
        audio = generation.cpu().numpy().squeeze().astype(np.float32)
        sample_rate = int(engine["model"].config.sampling_rate)
        expressive = True
        backend = "indic-parler-tts"
    else:
        inputs = engine["tokenizer"](text.strip(), return_tensors="pt").to(device)
        with torch.inference_mode():
            output = engine["model"](**inputs).waveform
        audio = output.squeeze().cpu().numpy().astype(np.float32)
        sample_rate = int(getattr(engine["model"].config, "sampling_rate", 16000))
        expressive = False
        backend = "mms-tts-mal"
        caption = None

    peak = np.max(np.abs(audio)) if audio.size else 0
    if peak > 1:
        audio = audio / peak

    return {
        "audio_base64": _wav_base64(audio, sample_rate),
        "mime_type": "audio/wav",
        "sample_rate": sample_rate,
        "voice": voice_name,
        "speaking_style": style,
        "backend": backend,
        "expressive": expressive,
        "description": caption if engine["kind"] == "parler" else None,
        "limitation": None
        if expressive
        else "MMS Malayalam TTS does not take emotion captions; style settings are ignored.",
    }
