from __future__ import annotations

import io

import numpy as np

from app.config import MAX_AUDIO_SECONDS


class AudioError(ValueError):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def load_mono_16k(data: bytes) -> tuple[np.ndarray, int]:
    try:
        import av
    except ImportError as exc:
        raise AudioError("PyAV is not installed. Run pip install av.", 500) from exc

    try:
        container = av.open(io.BytesIO(data))
    except Exception as exc:
        raise AudioError("Could not decode the uploaded audio.") from exc

    if not container.streams.audio:
        raise AudioError("No audio track found in the upload.")

    resampler = av.audio.resampler.AudioResampler(format="flt", layout="mono", rate=16000)
    chunks: list[np.ndarray] = []
    try:
        for frame in container.decode(audio=0):
            resampled = resampler.resample(frame)
            frames = resampled if isinstance(resampled, list) else [resampled]
            for item in frames:
                if item is None:
                    continue
                array = item.to_ndarray()
                chunks.append(np.squeeze(array).astype(np.float32))
        flushed = resampler.resample(None)
        frames = flushed if isinstance(flushed, list) else [flushed]
        for item in frames:
            if item is None:
                continue
            chunks.append(np.squeeze(item.to_ndarray()).astype(np.float32))
    except Exception as exc:
        raise AudioError("Failed while converting audio to 16 kHz mono.") from exc
    finally:
        container.close()

    if not chunks:
        raise AudioError("The recording was empty.")

    audio = np.concatenate([chunk.reshape(-1) for chunk in chunks]).astype(np.float32)
    peak = np.max(np.abs(audio)) if audio.size else 0
    if peak > 1.0:
        audio = audio / peak
    duration = audio.size / 16000
    if duration > MAX_AUDIO_SECONDS:
        raise AudioError(f"Recording is too long. Keep it under {MAX_AUDIO_SECONDS} seconds.", 413)
    if duration < 0.25:
        raise AudioError("Recording is too short.")
    return audio, 16000
