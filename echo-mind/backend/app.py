# backend/app.py
import os
import io
import tempfile
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

# Load environment variables
load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")

# Initialize FastAPI
app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend URL if deploying
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional imports
try:
    import assemblyai as aai
    aai.settings.api_key = ASSEMBLYAI_API_KEY
except Exception:
    aai = None

try:
    import openai
    openai.api_key = OPENAI_API_KEY
except Exception:
    openai = None

try:
    from murf import Murf
    murf_client = Murf(api_key=MURF_API_KEY)
except Exception:
    murf_client = None

# ===== ROUTES =====

@app.get("/")
def root():
    return {"message": "Backend is running!"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/hello")
def hello():
    return {"message": "Hello from API"}

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    data = await file.read()
    suffix = ".webm" if file.filename.endswith(".webm") else (".mp3" if file.filename.endswith(".mp3") else ".wav")
    
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp.flush()
        tmp_path = tmp.name

    if aai:
        try:
            config = aai.TranscriptionConfig()
            transcript = aai.Transcriber(config=config).transcribe(tmp_path)
            text = getattr(transcript, "text", None) or getattr(transcript, "transcript", None) or str(transcript)
            if isinstance(text, bytes):
                text = text.decode("utf-8")
        except Exception as e:
            text = f"[assemblyai transcription failed: {e}]"
    else:
        text = "Dummy transcript: Meeting discussed deadlines and tasks."

    return {"transcript": text}

@app.post("/api/summarize")
async def summarize(payload: dict):
    transcript = payload.get("transcript", "")
    if not transcript:
        return JSONResponse({"summary": "", "actions": []})

    if openai:
        try:
            messages = [
                {"role": "system", "content": "You are an assistant that extracts a concise 2-3 line summary and 3 action items from meeting transcript."},
                {"role": "user", "content": transcript}
            ]
            resp = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=200,
                temperature=0.2
            )
            out = resp.choices[0].message.content.strip()
            lines = [l.strip() for l in out.splitlines() if l.strip()]
            summary = lines[0] if lines else out
            actions = [l.lstrip('-* \t') for l in lines[1:4]] if len(lines) > 1 else []
        except Exception as e:
            summary = f"[summarization failed: {e}]"
            actions = []
    else:
        summary = "Team discussed project deadlines and scheduled a client call for next week."
        actions = ["Prepare agenda for client call", "Finalize deadlines", "Share meeting notes"]

    return {"summary": summary, "actions": actions}

@app.post("/api/tts")
async def tts(payload: dict):
    text = payload.get("text", "")
    if not text:
        return JSONResponse({"error": "No text provided"}, status_code=400)

    if murf_client:
        try:
            audio_bytes = None
            try:
                audio_bytes = murf_client.speech.synthesize(text=text)
            except Exception:
                try:
                    audio_bytes = murf_client.synthesize(text=text)
                except Exception:
                    audio_bytes = None

            if audio_bytes:
                if isinstance(audio_bytes, str):
                    audio_bytes = audio_bytes.encode("utf-8")
                return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")
        except Exception:
            pass

    # fallback: silent WAV
    def make_silent_wav():
        import wave
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(22050)
            wf.writeframes(b"")
        return buf.getvalue()

    wav = make_silent_wav()
    return StreamingResponse(io.BytesIO(wav), media_type="audio/wav")
