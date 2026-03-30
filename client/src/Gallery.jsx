import { useState, useEffect } from 'react'
import { useWallet } from './hooks/useWallet'
import './Gallery.css'

const API = import.meta.env.VITE_API_URL || ''

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function frameworkBadge(framework) {
  const map = {
    vite: { label: 'Vite', color: '#646cff' },
    react: { label: 'React', color: '#61dafb' },
    nextjs: { label: 'Next.js', color: '#fff' },
    astro: { label: 'Astro', color: '#ff5d01' },
    static: { label: 'Static', color: '#8BC53F' },
  }
  const f = map[framework] || { label: framework || 'Static', color: '#8BC53F' }
  return (
    <span className="gallery-framework" style={{ borderColor: f.color, color: f.color }}>
      {f.label}
    </span>
  )
}

export default function Gallery() {
  const { wallet } = useWallet()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API}/api/gallery`)
      .then(r => r.json())
      .then(data => {
        setItems(data.items || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load gallery.')
        setLoading(false)
      })
  }, [])

  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.framework || '').toLowerCase().includes(q) ||
      item.subdomain.toLowerCase().includes(q)
    )
  })

  return (
    <div className="gallery-page">
      {/* Nav */}
      <nav className="gallery-nav">
        <a href="/" className="gallery-logo">Shel<span>Kit</span></a>
        <div className="gallery-nav-links">
          <a href="/app">Deploy</a>
          <a href="/gallery" className="active">Gallery</a>
          <a href="/docs">Docs</a>
          {wallet ? (
            <a href="/dashboard" className="gallery-nav-btn">Dashboard</a>
          ) : (
            <a href="/app" className="gallery-nav-btn">Get Started</a>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="gallery-hero">
        <h1>Public Gallery</h1>
        <p>Sites deployed on ShelKit and shared with the community. Powered by Shelby Protocol.</p>
        <div className="gallery-search-wrap">
          <input
            className="gallery-search"
            type="text"
            placeholder="Search by name, framework, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="gallery-container">
        {loading && (
          <div className="gallery-empty">
            <div className="gallery-spinner" />
            <p>Loading gallery…</p>
          </div>
        )}

        {error && (
          <div className="gallery-empty">
            <p style={{ color: '#ff6b6b' }}>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="gallery-empty">
            <p>{search ? 'No results found.' : 'No public deployments yet. Be the first!'}</p>
            <a href="/app" className="gallery-cta">Deploy your site →</a>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="gallery-count">{filtered.length} site{filtered.length !== 1 ? 's' : ''}</p>
            <div className="gallery-grid">
              {filtered.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gallery-card"
                >
                  {/* Preview thumbnail — iframe with pointer events off */}
                  <div className="gallery-thumb">
                    <iframe
                      src={item.url}
                      title={item.title}
                      scrolling="no"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <div className="gallery-thumb-overlay" />
                  </div>

                  <div className="gallery-card-body">
                    <div className="gallery-card-top">
                      <span className="gallery-card-title">{item.title || item.subdomain}</span>
                      {frameworkBadge(item.framework)}
                    </div>

                    {item.description && (
                      <p className="gallery-card-desc">{item.description}</p>
                    )}

                    <div className="gallery-card-meta">
                      <span title="Total visits">👁 {item.hits.toLocaleString()}</span>
                      <span title="Files">{item.fileCount} file{item.fileCount !== 1 ? 's' : ''}</span>
                      <span title="Deployed">{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="gallery-footer">
        <p>
          Want your site listed?{' '}
          <a href="/dashboard">Open your dashboard</a> and toggle "Show in gallery" on any deployment.
        </p>
        <p style={{ color: '#555', marginTop: 8 }}>
          Deployed on{' '}
          <a href="https://shelkit.forestinfra.com" style={{ color: '#8BC53F' }}>ShelKit</a>
          {' '}· Powered by{' '}
          <a href="https://shelby.xyz" style={{ color: '#8BC53F' }}>Shelby Protocol</a>
        </p>
      </footer>
    </div>
  )
}
