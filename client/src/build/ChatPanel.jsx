import { useEffect, useRef, useState } from 'react'
import { isRetryable } from './errorCopy.js'

function relativeTime(ts, now) {
  const ms = Math.max(0, now - ts)
  if (ms < 60_000) {
    const s = Math.floor(ms / 1000)
    return s <= 1 ? 'just now' : `${s}s ago`
  }
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  return `${Math.floor(ms / 3_600_000)}h ago`
}

export default function ChatPanel({
  turns,
  status,
  error,
  isFirstTurn,
  inputValue,
  setInputValue,
  onSend,
  onReset,
  onRetry,
}) {
  const isBusy = status !== 'idle'
  const conversationEndRef = useRef(null)
  const inputRef = useRef(null)

  // Re-render every 15s so relative timestamps stay live between turns.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to bottom on new turn or new status.
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, status])

  const handleSubmit = () => {
    if (!inputValue.trim() || isBusy) return
    onSend(inputValue.trim())
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    // Cmd+Enter / Ctrl+Enter submits; plain Enter inserts newline.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-header-label">CHAT</span>
        {!isFirstTurn && !isBusy && (
          <button className="chat-startover" onClick={onReset} type="button">
            Start over
          </button>
        )}
      </div>

      <div className="chat-conversation">
        {isFirstTurn && turns.length === 0 && (
          <p className="chat-hint">
            Describe a site below and press <kbd>⌘</kbd>+<kbd>↵</kbd> to send.
            The more specific, the better the first draft.
          </p>
        )}

        {turns.map((turn, i) => {
          const prev = turns[i - 1]
          const showSeparator = i > 0 && prev?.role === 'assistant' && turn.role === 'user'
          return (
            <div key={`${turn.at}-${i}`}>
              {showSeparator && <div className="chat-separator" aria-hidden>—</div>}
              <div className={`chat-turn chat-turn-${turn.role}`}>
                <div className="chat-turn-meta">
                  <span className="chat-role">&gt; {turn.role === 'user' ? 'YOU' : 'CLAUDE'}</span>
                  <span className="chat-time">{relativeTime(turn.at, now)}</span>
                </div>
                <div className="chat-text">{turn.text}</div>
              </div>
            </div>
          )
        })}

        {isBusy && (
          <div className="chat-status">
            <span className="chat-status-dot" aria-hidden>▍</span>
            <span>
              {status === 'generating' ? 'Generating your site' : 'Applying your change'}
              {' — usually 15–30 seconds.'}
            </span>
          </div>
        )}

        {error && (
          <div className="chat-error" role="alert">
            <span className="chat-error-msg">{error.message}</span>
            {isRetryable(error.code) && (
              <button className="chat-error-retry" onClick={onRetry} type="button">
                Try again
              </button>
            )}
          </div>
        )}

        <div ref={conversationEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder={isFirstTurn
            ? 'A portfolio site for a freelance illustrator with a gallery and contact form.'
            : 'Make the hero darker. Add a testimonials section. Swap the headline.'}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          rows={isFirstTurn ? 5 : 3}
          maxLength={4000}
        />
        <div className="chat-input-actions">
          <span className="chat-input-hint">⌘+↵ to send</span>
          <button
            className="chat-send"
            onClick={handleSubmit}
            disabled={isBusy || !inputValue.trim()}
            type="button"
          >
            {isBusy ? (status === 'generating' ? 'Generating...' : 'Editing...') : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
