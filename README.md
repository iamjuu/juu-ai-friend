# Juu Pennu — Your Malayalam AI Companion

Malayalam voice assistant. It listens, thinks, and speaks in Malayalam. Chat uses the Google Gemini API so you can host the app without a local language model.

```
React (Vite)  →  Express  →  Gemini API (language)
                    ↓
              FastAPI speech service
              (faster-whisper + Indic Parler-TTS / MMS)
                    ↓
                 MongoDB
```

## Architecture

1. The React app records microphone audio or accepts typed Malayalam.
2. Express validates the request, stores conversation history in MongoDB, and calls Gemini for a Malayalam reply.
3. The Python FastAPI service transcribes speech and synthesizes Malayalam audio.
4. The browser plays the generated WAV and shows listening / thinking / speaking states.

Services bind to `127.0.0.1` in development.

## Prerequisites (Windows)

- Node.js 20+
- Python 3.12 (3.13 is less reliable for PyTorch wheels)
- MongoDB Community (local service)
- A free Gemini API key from https://aistudio.google.com/apikey
- Git (needed to install `parler-tts`)

## Selected models

See [docs/MODELS.md](docs/MODELS.md) for licenses, RAM, and why these were chosen.

| Role | Model | License |
| --- | --- | --- |
| Chat | Gemini `gemini-3.5-flash-lite` | Google API |
| STT | faster-whisper `small` | MIT |
| TTS | `ai4bharat/indic-parler-tts` | Apache 2.0 |
| TTS fallback | `facebook/mms-tts-mal` | CC-BY-NC 4.0 |

## Hardware notes

This project was set up on a Ryzen 7 4800H laptop with 16 GB RAM and a GTX 1650 4 GB GPU. Chat no longer needs that GPU. Speech inference defaults to CPU. Voice generation can take several seconds; the UI shows a generating-speech state instead of pretending it is real-time.

## Windows setup

Open PowerShell in the project folder.

### 1. Environment file

```powershell
copy .env.example .env
```

### 2. Gemini API key

Create a key at https://aistudio.google.com/apikey and set it in `.env`:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

If you want a stronger model and it is available on your key, set `GEMINI_MODEL=gemini-3.8-flash`.

### 3. Node.js

```powershell
cd client
npm install
cd ..\server
npm install
cd ..
```

### 4. Python speech service

```powershell
cd server\ai-services
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python -m pip install git+https://github.com/huggingface/parler-tts.git
cd ..\..
```

If the Parler-TTS git install fails, the service still starts and falls back to `facebook/mms-tts-mal`.

### 5. MongoDB

MongoDB should already be running as a Windows service:

```powershell
Get-Service MongoDB
```

If it is stopped:

```powershell
Start-Service MongoDB
```

## How to run

Use three terminals. Stop a service with `Ctrl+C`.

**Terminal 1 — Express**

```powershell
cd server
npm run dev
```

**Terminal 2 — React**

```powershell
cd client
npm run dev
```

**Terminal 3 — Python speech**

```powershell
cd server\ai-services
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:5173

Health checks:

```powershell
Invoke-RestMethod http://127.0.0.1:5050/api/health
Invoke-RestMethod http://127.0.0.1:5050/api/ai/status
Invoke-RestMethod http://127.0.0.1:8000/health
```

## How to test

### Malayalam text conversation

Type:

`ജൂ പെണ്ണ്, എനിക്ക് ഇന്ന് ഭയങ്കര വിഷമമാണ്.`

You should get a caring Malayalam reply, saved in the sidebar history.

### Speech recognition

Click **Talk to Juu Pennu**, allow the microphone, speak Malayalam, click the mic again. The transcript should appear as your message. If the Python service is down, the UI reports that instead of faking success.

### Expressive voice

With Indic Parler-TTS loaded, replies are spoken with Anjali and a style caption such as caring or cheerful. Listen for pacing and intelligibility. If MMS fallback is active, pronunciation can still be Malayalam, but emotion captions are ignored.

## Known limitations

- Chat needs a valid `GEMINI_API_KEY`. Text chat can be hosted without a GPU.
- Voice still needs the local Python speech service unless you host that separately.
- Indic Parler-TTS style prompts are not guaranteed realistic emotion.
- MMS fallback cannot do expressive styles and is CC-BY-NC.
- CPU TTS is not real-time on a GTX 1650-class laptop.
- Raw microphone recordings are not stored. Only transcripts and replies are saved.
- Authentication is not included in this MVP.

## Privacy

Chat text is sent to the Gemini API. Speech stays on this computer after models are downloaded. CORS is limited to the configured frontend origin. The Python service binds to localhost by default.
