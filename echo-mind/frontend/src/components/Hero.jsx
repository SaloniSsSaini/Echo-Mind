import React from 'react'

export default function Hero({ onStart }) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-sky-500 text-white">
      <div className="max-w-4xl mx-auto text-center px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">EchoMind</h1>
        <p className="text-lg md:text-2xl mb-8">Real-Time Transcription, Summarization, and Speech — Powered by AI</p>
        <div className="flex gap-4 justify-center">
          <button onClick={onStart} className="bg-white text-purple-700 px-6 py-3 rounded-full font-semibold shadow-lg hover:scale-105 transition">Start Recording</button>
          <a href="#features" className="px-6 py-3 border border-white rounded-full opacity-90">See Features</a>
        </div>
        <div className="mt-10 text-sm opacity-90">
          Built for demo • <a className="underline" href="https://murf.ai/api/docs/introduction/overview" target="_blank" rel="noreferrer">Powered by Murf</a>
        </div>
      </div>
    </section>
  )
}
