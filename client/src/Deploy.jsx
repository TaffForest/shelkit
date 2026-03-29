import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useWallet } from './hooks/useWallet.jsx'
import './Deploy.css'

export default function Deploy() {
  const { connected, address, token, loading: walletLoading, error: walletError, hasPetra, connect, disconnect, authHeaders } = useWallet()
  const [searchParams] = useSearchParams()

  // CLI callback: when authenticated, send token back to CLI's local server
  useEffect(() => {
    const cliCallback = searchParams.get('cli_callback')
    if (cliCallback && connected && token && address) {
      const callbackUrl = `${cliCallback}?token=${encodeURIComponent(token)}&wallet=${encodeURIComponent(address)}`
      fetch(callbackUrl, { mode: 'no-cors' }).catch(() => {})
    }
  }, [connected, token, address, searchParams])

  const [tab, setTab] = useState('upload') // 'upload' | 'github'
  const [file, setFile] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [customSubdomain, setCustomSubdomain] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [logs, setLogs] = useState([])
  const [buildPhase, setBuildPhase] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const inputRef = useRef(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleFile = (f) => {
    setError(null)
    setResult(null)
    setLogs([])
    if (f && f.name.endsWith('.zip')) {
      setFile(f)
    } else {
      setError('Please select a ZIP file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const addLog = (line) => {
    setLogs(prev => [...prev, line])
  }

  const deploy = async () => {
    if (!file) return
    setDeploying(true)
    setError(null)
    setResult(null)
    setLogs([])
    setUploadProgress(0)
    setBuildPhase('uploading')
    addLog('Uploading ZIP...')

    // Smooth creep animation for server-side processing phase
    let creepInterval = null
    const startCreep = (from, to, durationMs) => {
      if (creepInterval) clearInterval(creepInterval)
      const steps = 60
      const stepSize = (to - from) / steps
      const stepMs = durationMs / steps
      let current = from
      creepInterval = setInterval(() => {
        current = Math.min(current + stepSize, to - 0.5)
        setUploadProgress(Math.round(current))
      }, stepMs)
    }
    const stopCreep = () => { if (creepInterval) { clearInterval(creepInterval); creepInterval = null } }

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (customSubdomain.trim()) formData.append('subdomain', customSubdomain.trim().toLowerCase())

      // Phase 1: XHR upload (0–30%)
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/deploy')
        const hdrs = authHeaders()
        Object.entries(hdrs).forEach(([k, v]) => xhr.setRequestHeader(k, v))
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 30) // map to 0–30%
            setUploadProgress(pct)
          }
        }
        xhr.upload.onload = () => {
          // Upload to server done — start smooth creep 30→95% while server pins to Shelby
          setBuildPhase('pinning')
          addLog('Upload complete — pinning to Shelby...')
          const estimatedPinMs = Math.max(5000, (file.size / (1024 * 1024)) * 3000) // ~3s per MB
          startCreep(30, 95, estimatedPinMs)
        }
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText)
            if (xhr.status >= 400) reject(new Error(json.error || 'Deployment failed'))
            else resolve(json)
          } catch { reject(new Error('Invalid server response')) }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formData)
      })

      // Phase 2 complete — snap to 100%
      stopCreep()
      setUploadProgress(100)

      if (data.didBuild) {
        setBuildPhase('building')
        addLog('Build completed on server')
        addLog(`Framework: ${data.framework}`)
      } else {
        addLog('Static site — deployed directly')
      }

      addLog(`Pinned ${data.fileCount} files`)
      addLog(`CID: ${data.rootCID}`)
      addLog('')
      addLog('Live')

      setBuildPhase('done')
      setResult(data)
      setFile(null)
    } catch (err) {
      stopCreep()
      setError(err.message)
      addLog(`ERROR: ${err.message}`)
      setBuildPhase(null)
    } finally {
      setDeploying(false)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const deployGithub = async () => {
    if (!repoUrl) return
    setDeploying(true)
    setError(null)
    setResult(null)
    setLogs([])
    setBuildPhase('uploading')
    addLog(`Cloning ${repoUrl}...`)

    try {
      const res = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ repoUrl, subdomain: customSubdomain.trim().toLowerCase() || undefined }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deployment failed')

      if (data.didBuild) {
        addLog(`Framework: ${data.framework}`)
      }
      addLog(`Pinned ${data.fileCount} files`)
      addLog(`CID: ${data.rootCID}`)
      addLog('Live')

      setBuildPhase('done')
      setResult(data)
      setRepoUrl('')
    } catch (err) {
      setError(err.message)
      addLog(`ERROR: ${err.message}`)
      setBuildPhase(null)
    } finally {
      setDeploying(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  return (
    <div className="deploy-page">
      <nav className="deploy-nav">
        <Link to="/" className="deploy-nav-brand">
          <span>Shel<span className="accent">Kit</span></span>
        </Link>
        <div className="deploy-nav-links">
          {connected && <Link to="/dashboard">Deployments</Link>}
          {connected ? (
            <button className="wallet-connected-btn" onClick={disconnect}>
              <span className="wallet-dot" />
              {shortAddr(address)}
            </button>
          ) : null}
        </div>
      </nav>

      <div className="deploy-container">
        {/* Not connected — show connect prompt */}
        {!connected && (
          <div className="connect-gate fade-in">
            <div className="connect-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M22 10h-4a2 2 0 0 0 0 4h4" />
              </svg>
            </div>
            <h1>Connect your wallet</h1>
            <p>Sign in with Petra to deploy your site</p>

            {walletError && <div className="error">{walletError}</div>}

            {/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? (
              <div className="no-petra">
                <p>ShelKit requires the Petra wallet browser extension, which is available on desktop.</p>
                <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  You can also use the <a href="https://petra.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Petra mobile app</a> and open ShelKit in its built-in browser.
                </p>
              </div>
            ) : hasPetra ? (
              <button
                className="connect-btn"
                onClick={connect}
                disabled={walletLoading}
              >
                {walletLoading ? 'Connecting...' : 'Connect Petra Wallet'}
              </button>
            ) : (
              <div className="no-petra">
                <p>Petra wallet extension not detected.</p>
                <a
                  href="https://petra.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="install-petra-btn"
                >
                  Install Petra
                </a>
              </div>
            )}
          </div>
        )}

        {/* Connected — show deploy UI */}
        {connected && (
          <>
            <div className="deploy-header">
              <h1>Deploy your site</h1>
              <p>Upload a ZIP or deploy from GitHub</p>
            </div>

            {!deploying && !result && (
              <div className="deploy-tabs">
                <button className={`deploy-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Upload ZIP</button>
                <button className={`deploy-tab ${tab === 'github' ? 'active' : ''}`} onClick={() => setTab('github')}>GitHub Repo</button>
              </div>
            )}

            {error && <div className="error fade-in">{error}</div>}

            {tab === 'github' && !deploying && !result && (
              <div className="github-form fade-in">
                <input
                  type="text"
                  className="github-input"
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && deployGithub()}
                />
                <button className="deploy-btn" onClick={deployGithub} disabled={!repoUrl || deploying}>
                  Deploy from GitHub
                </button>
              </div>
            )}

            {tab === 'upload' && !deploying && !result && !file && (
              <div
                className={`dropzone fade-in ${dragOver ? 'drag-over' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="dropzone-icon-wrapper">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h3>Drop your ZIP here</h3>
                <p>Source code with package.json, or pre-built static files</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            )}

            {file && !deploying && !result && (
              <div className="file-selected fade-in">
                <div className="file-info">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div>
                    <div className="file-name">{file.name}</div>
                    <div className="file-size">{formatSize(file.size)}</div>
                  </div>
                </div>
                <button className="file-remove" onClick={() => setFile(null)} title="Remove">&times;</button>
              </div>
            )}

            {(deploying || (logs.length > 0 && !result)) && (
              <div className="build-terminal fade-in">
                <div className="terminal-header">
                  <div className="terminal-dots"><span /><span /><span /></div>
                  <span className="terminal-title">
                    {buildPhase === 'uploading' && `Uploading... ${uploadProgress}%`}
                    {buildPhase === 'pinning' && `Pinning to Shelby... ${uploadProgress}%`}
                    {buildPhase === 'building' && `Building project... ${uploadProgress}%`}
                    {buildPhase === 'done' && 'Complete'}
                    {!buildPhase && 'Build output'}
                  </span>
                </div>
                {(buildPhase === 'uploading' || buildPhase === 'pinning' || buildPhase === 'building') && (
                  <div className="upload-progress-bar">
                    <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                <div className="terminal-body">
                  {logs.map((line, i) => (
                    <div key={i} className={`terminal-line ${line.startsWith('ERROR') ? 'terminal-error' : ''} ${line.startsWith('---') ? 'terminal-heading' : ''}`}>
                      {line || '\u00A0'}
                    </div>
                  ))}
                  {deploying && (
                    <div className="terminal-line terminal-cursor">
                      <span className="cursor-blink" />
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {!deploying && !result && (file || tab === 'github') && (
              <div className="subdomain-input fade-in">
                <label className="subdomain-label">Custom subdomain (optional)</label>
                <div className="subdomain-row">
                  <input
                    type="text"
                    className="subdomain-field"
                    placeholder="my-app"
                    value={customSubdomain}
                    onChange={(e) => setCustomSubdomain(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
                  />
                  <span className="subdomain-suffix">.shelkit.forestinfra.com</span>
                </div>
              </div>
            )}

            {!deploying && !result && tab === 'upload' && (
              <button className="deploy-btn fade-in" onClick={deploy} disabled={!file}>
                Deploy
              </button>
            )}

            {result && (
              <div className="result-card slide-up">
                <div className="result-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3>Deployed successfully</h3>
                  {result.framework && <span className="result-framework">{result.framework}</span>}
                </div>

                <div className="result-row">
                  <span className="result-label">Deployment URL</span>
                  <div className="result-value result-url">
                    <a href={result.subdomain && result.subdomain !== result.deploymentId?.toLowerCase() ? `https://${result.subdomain}.shelkit.forestinfra.com` : result.url} target="_blank" rel="noopener noreferrer">
                      {result.subdomain && result.subdomain !== result.deploymentId?.toLowerCase() ? `https://${result.subdomain}.shelkit.forestinfra.com` : `${window.location.origin}${result.url}`}
                    </a>
                    <button className="copy-btn" onClick={() => copyToClipboard(window.location.origin + result.url)} title="Copy URL">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="result-row">
                  <span className="result-label">Root CID</span>
                  <div className="result-value result-cid">
                    <span>{result.rootCID}</span>
                    <button className="copy-btn" onClick={() => copyToClipboard(result.rootCID)} title="Copy CID">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="result-row">
                  <span className="result-label">Files</span>
                  <div className="result-value">{result.fileCount} file{result.fileCount !== 1 ? 's' : ''} deployed</div>
                </div>

                <div className="result-actions">
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn-visit">Visit site</a>
                  <button className="btn-new" onClick={() => { setResult(null); setLogs([]); setBuildPhase(null) }}>Deploy another</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
