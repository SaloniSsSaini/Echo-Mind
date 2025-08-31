import React, { useRef, useState } from "react";
import axios from "axios";
import Hero from "./components/Hero";
import Card from "./components/Card";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [actions, setActions] = useState([]);
  const chunksRef = useRef([]);
  const mediaRef = useRef(null);

  const startRecording = async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.start(1000);
      setRecording(true);
    } catch (e) {
      alert("Microphone access denied or not available: " + e);
    }
  };

  const stopAndUpload = async () => {
    const mr = mediaRef.current;
    if (!mr) return;
    await new Promise((res) => {
      mr.onstop = res;
      mr.stop();
    });
    setRecording(false);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("file", blob, "recording.webm");
    try {
      const r = await axios.post("http://localhost:8000/api/transcribe", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setTranscript(r.data.transcript || "");
      setSummary("");
      setActions([]);
    } catch (e) {
      alert("Transcription failed. Is backend running? " + e);
    }
  };

  const createSummary = async () => {
    if (!transcript) {
      alert("No transcript to summarize.");
      return;
    }
    try {
      const r = await axios.post("http://localhost:8000/api/summarize", { transcript });
      setSummary(r.data.summary || "");
      setActions(r.data.actions || []);
    } catch (e) {
      alert("Summary failed: " + e);
    }
  };

  const playTTS = async () => {
    if (!summary && !transcript) {
      alert("Nothing to speak.");
      return;
    }
    try {
      const res = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary || transcript }),
      });
      if (!res.ok) throw new Error("TTS request failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (e) {
      alert("TTS failed: " + e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Hero onStart={startRecording} />

      <main className="max-w-6xl mx-auto -mt-40 px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="Live Transcript">
            <div className="mb-3 flex gap-3">
              {!recording && <button onClick={startRecording} className="px-4 py-2 rounded bg-purple-600 text-white">Start</button>}
              {recording && <button onClick={stopAndUpload} className="px-4 py-2 rounded bg-red-500 text-white">Stop & Transcribe</button>}
              <button onClick={createSummary} className="px-4 py-2 rounded border">Summarize</button>
              <button onClick={playTTS} className="px-4 py-2 rounded bg-emerald-600 text-white">Play with Murf</button>
            </div>
            <div className="h-48 overflow-auto p-3 bg-white rounded-md border">{transcript || <em>Transcript will appear here</em>}</div>
          </Card>

          <Card title="Summary & Action Items">
            <div className="p-2 bg-white rounded-md min-h-[200px]">
              {summary ? <p className="mb-3">{summary}</p> : <em>No summary yet</em>}
              {actions.length > 0 && (
                <>
                  <h4 className="font-semibold mt-4">Actions</h4>
                  <ul className="list-disc ml-5">
                    {actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </>
              )}
            </div>
          </Card>
        </div>

        <section id="features" className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Advanced Features (Future)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card title="Real-time Subtitles">Live streaming transcription via WebSocket (AssemblyAI streaming).</Card>
            <Card title="Multi-language">Detect & transcribe multiple languages; Murf voices per language.</Card>
            <Card title="Export">Download PDF / SRT / Push actions to Notion or Trello.</Card>
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-sm text-gray-600">
        EchoMind — Real-Time Transcription & Summarization • <a className="underline" target="_blank" rel="noreferrer" href="https://murf.ai/api/docs/introduction/overview">Powered by Murf</a>
      </footer>
    </div>
  );
}
