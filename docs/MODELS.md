# Juu Mowlee model choices

Hardware used for the speech stack:

- CPU: AMD Ryzen 7 4800H (8 cores / 16 threads)
- RAM: 16 GB
- GPU: NVIDIA GeForce GTX 1650 4 GB (driver CUDA 12.5)
- Disk: keep Hugging Face caches on the system drive

Chat uses the Gemini API, so the language model does not run on this laptop. Speech models default to CPU.

## Conversation — Gemini `gemini-3.5-flash-lite`

- Provider: Google Gemini API
- Key: https://aistudio.google.com/apikey
- Malayalam: stronger than the previous local Qwen setup, and hostable without a GPU
- Env: `GEMINI_API_KEY` and optional `GEMINI_MODEL`

If you want a stronger model and it is available on your key, set:

```
GEMINI_MODEL=gemini-3.8-flash
```

## Speech recognition — faster-whisper `small`

Selected after comparing AI4Bharat IndicConformer and OpenAI Whisper.

| Option | Why it was or was not chosen |
| --- | --- |
| AI4Bharat IndicConformer Malayalam 120M | Strong for Malayalam, but the Hugging Face repo is gated and the official stack wants AI4Bharat NeMo. That is a heavy, fragile Windows install. |
| AI4Bharat IndicConformer 600M multilingual | MIT license and Malayalam support (`ml`). About 600M parameters. Optional backend: set `STT_BACKEND=indicconformer`. |
| faster-whisper `small` | **Default.** MIT license, Malayalam language id `ml`, CPU int8 uses about 1.5 GB RAM, no FFmpeg system install required (PyAV). Best practical option on this laptop. |

Install happens with the Python requirements. The small model downloads from Hugging Face on first transcription.

## Speech generation — Indic Parler-TTS, MMS fallback

| Option | Notes |
| --- | --- |
| `ai4bharat/indic-parler-tts` | **Preferred.** Apache 2.0. 0.9B parameters. Malayalam voices: Anjali, Anju, Harish. Official emotion/style captions for Malayalam. |
| `facebook/mms-tts-mal` | **Fallback.** CC-BY-NC 4.0. Smaller VITS Malayalam voice. No emotion captions. Used automatically if Parler-TTS cannot load. |

Style captions are sent to Parler-TTS. They do not magically create realistic acting; they only work as far as the model allows. If MMS is active, speaking-style settings are ignored and the API reports that limitation.

Speech models stay on CPU by default (`AI_DEVICE=cpu`).

## What leaves the computer

Chat text is sent to the Gemini API. Speech recognition and voice generation stay local after Hugging Face models are downloaded.
