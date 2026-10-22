import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


HOST = os.getenv("AI_HOST", "127.0.0.1")
PORT = int(os.getenv("AI_PORT", "8000"))
STT_BACKEND = os.getenv("STT_BACKEND", "whisper")
STT_MODEL = os.getenv("STT_MODEL", "small")
TTS_BACKEND = os.getenv("TTS_BACKEND", "parler")
TTS_MODEL = os.getenv("TTS_MODEL", "ai4bharat/indic-parler-tts")
TTS_FALLBACK_MODEL = os.getenv("TTS_FALLBACK_MODEL", "facebook/mms-tts-mal")
TTS_VOICE = os.getenv("TTS_VOICE", "Anjali")
DEVICE = os.getenv("AI_DEVICE", "auto")
MAX_AUDIO_SECONDS = int(os.getenv("MAX_AUDIO_SECONDS", "60"))
TMP_DIR = Path(os.getenv("AI_TMP_DIR", Path(__file__).resolve().parents[1] / "tmp"))
TMP_DIR.mkdir(parents=True, exist_ok=True)
ALLOW_GPU = _bool("AI_ALLOW_GPU", True)
