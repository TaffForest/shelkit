import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './hooks/useWallet.jsx'
import Landing from './Landing'
import Deploy from './Deploy'
import Dashboard from './Dashboard'

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Deploy />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  )
}
