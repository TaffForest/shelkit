import { useReducer, useCallback, useMemo } from 'react'
import { zipPreview } from './zipFiles.js'
import { friendlyError } from './errorCopy.js'

const GENERATE_TIMEOUT_MS = 180_000
const EDIT_TIMEOUT_MS = 180_000
const DEPLOY_TIMEOUT_MS = 180_000

const initialDeploy = {
  status: 'idle',           // 'idle' | 'deploying' | 'success' | 'failure'
  deploymentId: null,
  subdomain: null,
  url: null,                // /deploy/<id> form — works in dev and prod
  deployedAtTurnCount: 0,   // turns.length at deploy time, for stale detection
  error: null,
}

const initialState = {
  status: 'idle',          // 'idle' | 'generating' | 'editing'
  sessionId: null,
  previewUrl: null,
  previewVersion: 0,       // bumped on each success; appended to iframe src for cache-bust
  turns: [],               // [{ role: 'user' | 'assistant', text: string, at: number }]
  error: null,             // null | { message, code, retryAfter }
  deploy: initialDeploy,
}

function reducer(state, action) {
  switch (action.type) {
    case 'GENERATE_START':
      return {
        ...state,
        status: 'generating',
        error: null,
        turns: [...state.turns, { role: 'user', text: action.prompt, at: Date.now() }],
      }
    case 'GENERATE_SUCCESS':
      return {
        ...state,
        status: 'idle',
        sessionId: action.sessionId,
        previewUrl: action.previewUrl,
        previewVersion: state.previewVersion + 1,
        turns: [...state.turns, { role: 'assistant', text: action.assistantMessage, at: Date.now() }],
      }
    case 'EDIT_START':
      return {
        ...state,
        status: 'editing',
        error: null,
        turns: [...state.turns, { role: 'user', text: action.instruction, at: Date.now() }],
      }
    case 'EDIT_SUCCESS':
      return {
        ...state,
        status: 'idle',
        previewVersion: state.previewVersion + 1,
        turns: [...state.turns, { role: 'assistant', text: action.assistantMessage, at: Date.now() }],
      }
    case 'RETRY_GENERATE_START':
      // No turn push — the failed user turn is already in state.turns.
      return { ...state, status: 'generating', error: null }
    case 'RETRY_EDIT_START':
      return { ...state, status: 'editing', error: null }
    case 'FAILURE':
      return {
        ...state,
        status: 'idle',
        error: { message: action.message, code: action.code, retryAfter: action.retryAfter ?? null },
      }
    case 'DEPLOY_START':
      return { ...state, deploy: { ...state.deploy, status: 'deploying', error: null } }
    case 'DEPLOY_SUCCESS':
      return {
        ...state,
        deploy: {
          status: 'success',
          deploymentId: action.deploymentId,
          subdomain: action.subdomain,
          url: action.url,
          deployedAtTurnCount: state.turns.length,
          error: null,
        },
      }
    case 'DEPLOY_FAILURE':
      return { ...state, deploy: { ...state.deploy, status: 'failure', error: action.message } }
    case 'RESET':
      return { ...initialState, previewVersion: state.previewVersion + 1 }
    default:
      return state
  }
}

/** Parse a Retry-After response header. Returns seconds or null. */
function parseRetryAfter(value) {
  if (!value) return null
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Dispatch a FAILURE shaped from an HTTP response with a `code`. */
async function failureFromResponse(res, dispatch) {
  const data = await res.json().catch(() => ({}))
  const code = data.code || 'unknown'
  const retryAfter = parseRetryAfter(res.headers.get('Retry-After'))
  dispatch({ type: 'FAILURE', message: friendlyError(code, retryAfter), code, retryAfter })
}

export function useBuildState(authHeaders) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Inner fetch helpers — no START dispatch; caller handles that. Lets
  // both the public generate()/edit() and retry() share the network code
  // without duplicating turn-push semantics.

  const runGenerate = useCallback(async (prompt) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'AbortError')), GENERATE_TIMEOUT_MS)
    try {
      const res = await fetch('/api/build/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ prompt }),
        signal: ctrl.signal,
      })
      if (!res.ok) return failureFromResponse(res, dispatch)
      const data = await res.json()
      dispatch({
        type: 'GENERATE_SUCCESS',
        sessionId: data.sessionId,
        previewUrl: data.previewUrl,
        assistantMessage: data.assistantMessage || '',
      })
    } catch (err) {
      const code = err?.name === 'AbortError' ? 'timeout' : 'unknown'
      dispatch({ type: 'FAILURE', message: friendlyError(code, null), code, retryAfter: null })
    } finally {
      clearTimeout(timer)
    }
  }, [authHeaders])

  const runEdit = useCallback(async (sessionId, instruction, conversation) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'AbortError')), EDIT_TIMEOUT_MS)
    try {
      const res = await fetch('/api/build/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId, instruction, conversation }),
        signal: ctrl.signal,
      })
      if (!res.ok) return failureFromResponse(res, dispatch)
      const data = await res.json()
      dispatch({ type: 'EDIT_SUCCESS', assistantMessage: data.assistantMessage || '' })
    } catch (err) {
      const code = err?.name === 'AbortError' ? 'timeout' : 'unknown'
      dispatch({ type: 'FAILURE', message: friendlyError(code, null), code, retryAfter: null })
    } finally {
      clearTimeout(timer)
    }
  }, [authHeaders])

  const generate = useCallback(async (prompt) => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    dispatch({ type: 'GENERATE_START', prompt: trimmed })
    await runGenerate(trimmed)
  }, [runGenerate])

  const edit = useCallback(async (instruction) => {
    const trimmed = instruction.trim()
    if (!trimmed || !state.sessionId) return
    // Snapshot conversation BEFORE dispatch so we don't double-send the new instruction.
    const conversation = state.turns.map(t => ({ role: t.role, text: t.text }))
    dispatch({ type: 'EDIT_START', instruction: trimmed })
    await runEdit(state.sessionId, trimmed, conversation)
  }, [runEdit, state.sessionId, state.turns])

  const retry = useCallback(async () => {
    if (!state.error) return
    // Failed user turn is still the last turn in state.turns.
    const lastUser = [...state.turns].reverse().find(t => t.role === 'user')
    if (!lastUser) return

    if (!state.sessionId) {
      dispatch({ type: 'RETRY_GENERATE_START' })
      await runGenerate(lastUser.text)
    } else {
      // History = all turns BEFORE the failed user turn.
      const history = state.turns.slice(0, -1).map(t => ({ role: t.role, text: t.text }))
      dispatch({ type: 'RETRY_EDIT_START' })
      await runEdit(state.sessionId, lastUser.text, history)
    }
  }, [runGenerate, runEdit, state.error, state.sessionId, state.turns])

  const deploy = useCallback(async () => {
    if (!state.previewUrl || state.deploy.status === 'deploying') return
    dispatch({ type: 'DEPLOY_START' })

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'AbortError')), DEPLOY_TIMEOUT_MS)

    try {
      const zipFile = await zipPreview(state.previewUrl)
      const form = new FormData()
      form.append('file', zipFile)

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { ...authHeaders() }, // multer reads file from FormData; no Content-Type
        body: form,
        signal: ctrl.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Deploy failed (${res.status})`)
      dispatch({
        type: 'DEPLOY_SUCCESS',
        deploymentId: data.deploymentId,
        subdomain: data.subdomain,
        url: data.url,
      })
    } catch (err) {
      const message = err?.name === 'AbortError'
        ? 'Deploy took longer than 180 seconds and was cancelled. Try again, or check the Dashboard for a partial deployment.'
        : (err.message || 'Deploy failed.')
      dispatch({ type: 'DEPLOY_FAILURE', message })
    } finally {
      clearTimeout(timer)
    }
  }, [authHeaders, state.previewUrl, state.deploy.status])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const derived = useMemo(() => ({
    isBusy: state.status !== 'idle',
    isFirstTurn: state.sessionId === null,
  }), [state.status, state.sessionId])

  return { state, generate, edit, deploy, retry, reset, ...derived }
}
