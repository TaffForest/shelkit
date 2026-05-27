const EXAMPLE_PROMPTS = [
  'A landing page for a SaaS that helps developers manage cron jobs.',
  'A portfolio site for a freelance illustrator with a gallery and contact form.',
  'A menu and ordering page for a Pembrokeshire pizza place.',
]

export default function PreviewPane({
  previewUrl,
  previewVersion,
  status,
  isFirstTurn,
  onUsePrompt,
}) {
  const isBusy = status !== 'idle'
  const hasPreview = !!previewUrl

  if (!hasPreview && isBusy && isFirstTurn) {
    return (
      <div className="preview-pane">
        <div className="preview-loading">
          <span className="preview-loading-dot" aria-hidden>▍</span>
          <p>Generating your site...</p>
          <p className="muted">Usually 15–30 seconds.</p>
        </div>
      </div>
    )
  }

  if (!hasPreview) {
    return (
      <div className="preview-pane">
        <div className="preview-empty">
          <span className="preview-eyebrow">OUTPUT</span>
          <h2 className="preview-headline">Your site will render here.</h2>
          <p className="muted">Try one of these to get going:</p>
          <ul className="preview-examples">
            {EXAMPLE_PROMPTS.map(p => (
              <li key={p}>
                <button type="button" className="preview-example" onClick={() => onUsePrompt(p)}>
                  &gt; {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // Cache-bust via querystring; iframe element stays mounted across edits to
  // avoid a hard remount flash. Server sends Cache-Control: no-store so a URL
  // change reliably triggers a fresh fetch.
  const src = `${previewUrl}?v=${previewVersion}`

  return (
    <div className="preview-pane preview-pane-active">
      <iframe
        src={src}
        className={`preview-iframe ${isBusy ? 'preview-iframe-busy' : ''}`}
        sandbox="allow-scripts"
        title="Generated site preview"
      />
      {isBusy && (
        <div className="preview-busy-overlay" aria-hidden>
          <span className="preview-loading-dot">▍</span>
          <span>Applying your change…</span>
        </div>
      )}
    </div>
  )
}
