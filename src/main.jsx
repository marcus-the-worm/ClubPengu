import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Note: StrictMode removed - was causing double-mount issues with minigames (CardJitsu)
// In React 18, StrictMode double-invokes render/effects which conflicts with game state
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)









