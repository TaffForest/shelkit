import { useState } from 'react'

// In dev the displayed subdomain URL (a real public domain) won't resolve.
// We still show it because it's the canonical, shareable form; clicks go to
// the relative /deploy/<id> path which works on both dev and prod.
const BASE_DOMAIN_DISPLAY = 'shelkit.forestinfra.com'
const isDevHost = typeof window !== 'undefined'
  && /^(localhost|127\.0\.0\.1)/.test(window.location.hostname)

export default function DeployBar({ previewUrl, deploy, currentTurnCount, onDeploy, isChatBusy }) {
  const [copied, setCopied] = useState(false)
  const { status } = deploy

  const copyUrl = async () => {
    if (!deploy.subdomain) return
    try {
      await navigator.clipboard.writeText(`https://${deploy.subdomain}.${BASE_DOMAIN_DISPLAY}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard refused (e.g. http context) — silent */
    }
  }

  if (status === 'deploying') {
    return (
      <div className="deploy-bar deploy-bar-deploying" role="status" aria-live="polite">
        <span className="deploy-caret" aria-hidden>▍</span>
        <span>Deploying — usually 5–15 seconds.</span>
      </div>
    )
  }

  if (status === 'failure') {
    return (
      <div className="deploy-bar deploy-bar-failure" role="alert">
        <span className="deploy-failure-msg">Deploy failed: {deploy.error}</span>
        <button
          className="deploy-again"
          onClick={onDeploy}
          disabled={isChatBusy || !previewUrl}
          type="button"
        >
          Try again
        </button>
      </div>
    )
  }

  if (status === 'success') {
    const isStale = currentTurnCount > deploy.deployedAtTurnCount
    return (
      <div className="deploy-bar deploy-bar-success">
        <span className="deploy-status">DEPLOYED</span>
        <div className="deploy-url-block">
          <a
            href={deploy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="deploy-url"
            title="Open deployment"
          >
            {`${deploy.subdomain}.${BASE_DOMAIN_DISPLAY}`}
          </a>
          <button className="deploy-copy" onClick={copyUrl} type="button" title="Copy URL">
            {copied ? 'copied' : 'copy'}
          </button>
          {isDevHost && <span className="deploy-caption">(dev preview link)</span>}
          {isStale && <span className="deploy-caption">(previous version)</span>}
        </div>
        <button
          className="deploy-again"
          onClick={onDeploy}
          disabled={isChatBusy}
          type="button"
        >
          Deploy again
        </button>
      </div>
    )
  }

  // idle
  return (
    <div className="deploy-bar deploy-bar-idle">
      <button
        className="deploy-btn"
        onClick={onDeploy}
        disabled={isChatBusy || !previewUrl}
        type="button"
      >
        Deploy to Shelby
      </button>
    </div>
  )
}
