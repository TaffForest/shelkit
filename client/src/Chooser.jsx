import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useWallet } from './hooks/useWallet.jsx'
import './Chooser.css'

export default function Chooser() {
  const {
    connected,
    address,
    loading: walletLoading,
    error: walletError,
    hasPetra,
    connect,
    disconnect,
  } = useWallet()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // CLI passthrough: if the CLI sent the user here with cli_callback, skip the
  // chooser and route directly to upload (the CLI is always about uploading).
  // The query param is preserved so Upload.jsx (currently Deploy.jsx) can fire
  // the callback after auth lands. Removed in Chunk 6 when the CLI goes away.
  useEffect(() => {
    const cliCallback = searchParams.get('cli_callback')
    if (cliCallback && connected) {
      navigate(`/upload?cli_callback=${encodeURIComponent(cliCallback)}`, { replace: true })
    }
  }, [connected, searchParams, navigate])

  return (
    <div className="chooser-page">
      <nav className="chooser-nav">
        <div className="chooser-nav-inner">
          <Link to="/" className="chooser-nav-brand">
            <span>Shel<span className="accent">Kit</span></span>
          </Link>
          <div className="chooser-nav-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/docs">Docs</Link>
            <Link to="/gallery">Gallery</Link>
            {connected && (
              <button className="wallet-pill" onClick={disconnect} title={address}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </button>
            )}
          </div>
        </div>
      </nav>

      {!connected ? (
        <div className="chooser-connect">
          <div className="chooser-connect-card">
            <h1>Sign in to ShelKit</h1>
            <p>Connect your Petra wallet to start building or upload a site.</p>
            {!hasPetra && (
              <p className="muted">
                Petra wallet not detected.{' '}
                <a href="https://petra.app" target="_blank" rel="noopener noreferrer">Install Petra</a> to continue.
              </p>
            )}
            <button className="chooser-btn" onClick={connect} disabled={walletLoading || !hasPetra}>
              {walletLoading ? 'Connecting...' : 'Connect Petra'}
            </button>
            {walletError && <p className="chooser-error">{walletError}</p>}
          </div>
        </div>
      ) : (
        <div className="chooser-main">
          <div className="chooser-header">
            <span className="chooser-eyebrow">WHAT ARE WE MAKING?</span>
            <h1>Pick a path.</h1>
            <p>You can do either. Both end on Shelby.</p>
          </div>

          <div className="chooser-cards">
            <Link to="/build" className="chooser-card">
              <span className="chooser-card-eyebrow">&gt; BUILD WITH AI</span>
              <h2>Describe a site.<br />Watch it build.</h2>
              <p>Chat your way to a finished design. Iterate by message. Deploy when it looks right.</p>
              <span className="chooser-card-cta">Start building →</span>
            </Link>

            <Link to="/upload" className="chooser-card">
              <span className="chooser-card-eyebrow">&gt; UPLOAD A SITE</span>
              <h2>Got one already?<br />Ship it.</h2>
              <p>Drop a ZIP or paste a GitHub URL. We pin every file to Shelby and give you a live URL in seconds.</p>
              <span className="chooser-card-cta">Upload a site →</span>
            </Link>
          </div>

          <Link to="/dashboard" className="chooser-tertiary">
            View your existing deployments →
          </Link>
        </div>
      )}
    </div>
  )
}
