import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from './hooks/useWallet.jsx'
import { useBuildState } from './build/useBuildState.js'
import ChatPanel from './build/ChatPanel.jsx'
import PreviewPane from './build/PreviewPane.jsx'
import './Build.css'

export default function Build() {
  const {
    connected,
    address,
    loading: walletLoading,
    error: walletError,
    hasPetra,
    connect,
    disconnect,
    authHeaders,
  } = useWallet()

  const { state, generate, edit, deploy, reset, isBusy, isFirstTurn } = useBuildState(authHeaders)
  const [inputValue, setInputValue] = useState('')

  const handleSend = (text) => {
    if (isFirstTurn) generate(text)
    else edit(text)
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
          <ChatPanel
            turns={state.turns}
            status={state.status}
            error={state.error}
            isFirstTurn={isFirstTurn}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSend={handleSend}
            onReset={reset}
          />
          <PreviewPane
            previewUrl={state.previewUrl}
            previewVersion={state.previewVersion}
            status={state.status}
            isFirstTurn={isFirstTurn}
            onUsePrompt={(p) => setInputValue(p)}
            deploy={state.deploy}
            turnCount={state.turns.length}
            onDeploy={deploy}
          />
        </div>
      )}
    </div>
  )
}
