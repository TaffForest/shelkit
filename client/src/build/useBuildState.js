import { useReducer, useCallback, useMemo } from 'react'

const initialState = {
  status: 'idle',          // 'idle' | 'generating' | 'editing'
  sessionId: null,
  previewUrl: null,
  previewVersion: 0,       // bumped on each success; appended to iframe src for cache-bust
  turns: [],               // [{ role: 'user' | 'assistant', text: string, at: number }]
  error: null,
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
    case 'FAILURE':
      return { ...state, status: 'idle', error: action.message }
    case 'RESET':
      return { ...initialState, previewVersion: state.previewVersion + 1 }
    default:
      return state
  }
}

export function useBuildState(authHeaders) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const generate = useCallback(async (prompt) => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    dispatch({ type: 'GENERATE_START', prompt: trimmed })
    try {
      const res = await fetch('/api/build/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ prompt: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      dispatch({
        type: 'GENERATE_SUCCESS',
        sessionId: data.sessionId,
        previewUrl: data.previewUrl,
        assistantMessage: data.assistantMessage || '',
      })
    } catch (err) {
      dispatch({ type: 'FAILURE', message: err.message })
    }
  }, [authHeaders])

  const edit = useCallback(async (instruction) => {
    const trimmed = instruction.trim()
    if (!trimmed || !state.sessionId) return
    // Snapshot conversation BEFORE dispatch so we don't double-send the new instruction.
    const conversation = state.turns.map(t => ({ role: t.role, text: t.text }))
    dispatch({ type: 'EDIT_START', instruction: trimmed })
    try {
      const res = await fetch('/api/build/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId: state.sessionId, instruction: trimmed, conversation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Edit failed')
      dispatch({ type: 'EDIT_SUCCESS', assistantMessage: data.assistantMessage || '' })
    } catch (err) {
      dispatch({ type: 'FAILURE', message: err.message })
    }
  }, [authHeaders, state.sessionId, state.turns])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const derived = useMemo(() => ({
    isBusy: state.status !== 'idle',
    isFirstTurn: state.sessionId === null,
  }), [state.status, state.sessionId])

  return { state, generate, edit, reset, ...derived }
}
