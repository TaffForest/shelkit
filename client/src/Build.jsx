import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from './hooks/useWallet.jsx'
import './Build.css'

export default function Build() {
  const { connected, address, loading: walletLoading, error: walletError, hasPetra, connect, disconnect, authHeaders } = useWallet()
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [assistantMessage, setAssistantMessage] = useState(null)
  const [error, setError] = useState(null)

  const generate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setError(null)
    setAssistantMessage(null)
    try {
      const res = await fetch('/api/build/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setPreviewUrl(data.previewUrl)
      setAssistantMessage(data.assistantMessage)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="build-page">
      <nav className="build-nav">
        <div className="build-nav-inner">
          <Link to="/" className="build-nav-brand">
            <span>Shel<span className="accent">Kit</span></span>
            <span className="build-nav-sub">Build</span>
          </Link>
          <div className="build-nav-links">
            <Link to="/app">Deploy</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/docs">Docs</Link>
            {connected && (
              <button className="wallet-pill" onClick={disconnect} title={address}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </button>
            )}
          </div>
        </div>
      </nav>

      {!connected ? (
        <div className="build-connect">
          <div className="build-connect-card">
            <h1>ShelKit Build</h1>
            <p>Describe a site in plain English. Get a live preview. Deploy to Shelby.</p>
            {!hasPetra && (
              <p className="muted">
                Petra wallet not detected.{' '}
                <a href="https://petra.app" target="_blank" rel="noopener noreferrer">Install Petra</a> to continue.
              </p>
            )}
            <button className="build-btn" onClick={connect} disabled={walletLoading || !hasPetra}>
              {walletLoading ? 'Connecting...' : 'Connect Petra'}
            </button>
            {walletError && <p className="build-error">{walletError}</p>}
          </div>
        </div>
      ) : (
        <div className="build-container">
          <div className="build-left">
            <h1>Describe your site</h1>
            <p className="muted">One or two sentences. The more specific, the better the first draft.</p>
            <textarea
              className="build-prompt"
              placeholder="A portfolio site for a freelance illustrator with a gallery section and a contact form."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={generating}
              rows={6}
              maxLength={4000}
            />
            <button
              className="build-btn"
              onClick={generate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
            {error && <p className="build-error">{error}</p>}
            {assistantMessage && <p className="build-assistant">{assistantMessage}</p>}
          </div>

          <div className="build-right">
            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                className="build-preview"
                sandbox="allow-scripts"
                title="Generated site preview"
              />
            ) : (
              <div className="build-preview-empty">
                <p className="muted">Your live preview will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
