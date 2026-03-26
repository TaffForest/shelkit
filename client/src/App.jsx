import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './hooks/useWallet.jsx'
import { Component } from 'react'
import Landing from './Landing'
import Deploy from './Deploy'
import Dashboard from './Dashboard'
import Docs from './Docs'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('ShelKit error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#e8e8e8', background: '#050505', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Something went wrong</h1>
          <p style={{ color: '#999', marginBottom: '24px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            style={{ padding: '10px 24px', background: '#8BC53F', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
          >
            Go home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFound() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#e8e8e8', background: '#050505', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0, color: '#8BC53F' }}>404</h1>
      <p style={{ color: '#999', marginBottom: '24px' }}>Page not found</p>
      <a href="/" style={{ color: '#8BC53F' }}>Go home</a>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Deploy />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </ErrorBoundary>
  )
}
