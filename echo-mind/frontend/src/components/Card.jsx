import React from 'react'

export default function Card({ title, children }) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-6">
      <h3 className="font-semibold text-lg mb-3">{title}</h3>
      <div>{children}</div>
    </div>
  )
}
