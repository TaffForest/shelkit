import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from './hooks/useWallet.jsx'
import './Dashboard.css'

export default function Dashboard() {
  const { connected, address, authHeaders, disconnect } = useWallet()
  const navigate = useNavigate()
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  // Redirect to deploy page if not connected
  useEffect(() => {
    if (!connected) {
      navigate('/app')
    }
  }, [connected, navigate])

  useEffect(() => {
    if (!connected) return
    fetch('/api/deployments', { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) {
          disconnect()
          return []
        }
        return r.json()
      })
      .then(data => setDeployments(data || []))
      .catch(() => setDeployments([]))
      .finally(() => setLoading(false))
  }, [connected])

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this deployment? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/deployments/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        setDeployments(prev => prev.filter(d => d.id !== id))
      }
    } catch {}
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  if (!connected) return null

  return (
    <div className="dash-page">
      <nav className="deploy-nav">
        <Link to="/" className="deploy-nav-brand">
          <span>Shel<span className="accent">Kit</span></span>
        </Link>
        <div className="deploy-nav-links">
          <Link to="/app">New deploy</Link>
          <button className="wallet-connected-btn" onClick={disconnect}>
            <span className="wallet-dot" />
            {shortAddr(address)}
          </button>
        </div>
      </nav>

      <div className="dash-container">
        <div className="dash-header">
          <div>
            <h1>Deployments</h1>
            <p>{deployments.length} deployment{deployments.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/app" className="dash-new-btn">New deploy</Link>
        </div>

        {loading && (
          <div className="dash-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="dash-card dash-skeleton">
                <div className="skeleton-line skeleton-wide" />
                <div className="skeleton-line skeleton-medium" />
                <div className="skeleton-line skeleton-narrow" />
              </div>
            ))}
          </div>
        )}

        {!loading && deployments.length === 0 && (
          <div className="dash-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 3H8l-2 4h12l-2-4z" />
            </svg>
            <h3>No deployments yet</h3>
            <p>Deploy your first site to get started.</p>
            <Link to="/app" className="dash-cta">Deploy now</Link>
          </div>
        )}

        {!loading && deployments.length > 0 && (
          <div className="dash-list">
            {deployments.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((d) => (
              <div key={d.id} className="dash-card">
                <div className="dash-card-top">
                  <div className="dash-card-status">
                    <span className="status-dot" />
                    Live
                    {d.framework && <span className="dash-framework-badge">{d.framework}</span>}
                  </div>
                  <span className="dash-card-time">{timeAgo(d.createdAt)}</span>
                </div>

                <div className="dash-card-url">
                  <a href={`/deploy/${d.id}`} target="_blank" rel="noopener noreferrer">
                    {window.location.origin}/deploy/{d.id}
                  </a>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(`${window.location.origin}/deploy/${d.id}`)}
                    title="Copy URL"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>

                <div className="dash-card-meta">
                  <span className="dash-card-cid" title={d.rootCID}>
                    CID: {d.rootCID.slice(0, 20)}...
                  </span>
                  <span className="dash-card-files">{d.fileCount} file{d.fileCount !== 1 ? 's' : ''}</span>
                  {d.version > 1 && <span className="dash-card-version">v{d.version}</span>}
                </div>

                <div className="dash-card-actions">
                  <a href={`/deploy/${d.id}`} target="_blank" rel="noopener noreferrer" className="dash-action-btn">
                    Visit
                  </a>
                  <button className="dash-action-btn dash-delete-btn" onClick={() => handleDelete(d.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && deployments.length > PER_PAGE && (
          <div className="dash-pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page} of {Math.ceil(deployments.length / PER_PAGE)}</span>
            <button disabled={page >= Math.ceil(deployments.length / PER_PAGE)} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
