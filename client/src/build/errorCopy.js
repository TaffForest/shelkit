// User-facing error copy for the chat panel. Keyed on the `code` field
// the server returns (or `timeout` set client-side on AbortError). Server
// also returns a human message but we override with code-keyed copy so
// nothing developer-facing leaks to end users.

const STATIC_COPY = {
  empty_files:         'The model returned an unexpected response. Try again — usually transient.',
  no_tool_call:        'The model returned an unexpected response. Try again — usually transient.',
  rate_limited:        'Anthropic rate limit hit. Try again in a moment.',
  auth:                "Something's not set up right on our end. This isn't your fault — try again shortly.",
  timeout:             'The request took longer than 90 seconds and was cancelled. Try again, or simplify your prompt.',
  unknown:             "Something went wrong. Try again — if it keeps happening, it's on our end, not yours.",
}

const RETRYABLE = new Set(['empty_files', 'no_tool_call', 'rate_limited', 'timeout', 'unknown'])

export function formatRetryAfter(seconds) {
  if (!seconds || seconds <= 0) return 'a moment'
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

export function friendlyError(code, retryAfter) {
  if (code === 'rate_limited_client') {
    return `Hit the build rate limit. Try again in ${formatRetryAfter(retryAfter)}.`
  }
  return STATIC_COPY[code] || STATIC_COPY.unknown
}

export function isRetryable(code) {
  return RETRYABLE.has(code)
}
