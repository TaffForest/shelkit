import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useWallet as useAptosWallet, AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'shelkit_token'
const WALLET_KEY = 'shelkit_wallet'

/** Inner provider that uses the Aptos wallet adapter */
function AuthProvider({ children }) {
  const {
    connected: walletConnected,
    account,
    connect: aptosConnect,
    disconnect: aptosDisconnect,
    wallets,
    signMessage,
  } = useAptosWallet()

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [savedAddress, setSavedAddress] = useState(() => localStorage.getItem(WALLET_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // account.address may be an AccountAddress object — always convert to string
  const address = (account?.address
    ? (typeof account.address === 'string' ? account.address : account.address.toString())
    : null) || savedAddress
  const connected = !!(address && token)

  // Verify saved token on mount
  useEffect(() => {
    if (token && savedAddress) {
      fetch('/api/deployments', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => {
        if (res.status === 401) {
          disconnect()
        }
      }).catch(() => {})
    }
  }, [])

  // When wallet connects via adapter, start auth flow
  useEffect(() => {
    if (walletConnected && account && !token) {
      // account.address may be a string or AccountAddress object
      const addr = typeof account.address === 'string'
        ? account.address
        : account.address?.toString?.() || String(account.address)
      if (addr) authenticateWallet(addr)
    }
  }, [walletConnected, account])

  const authenticateWallet = async (walletAddress) => {
    // Ensure it's a string
    const addr = String(walletAddress)
    setLoading(true)
    setError(null)

    try {
      // 1. Get challenge from server
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      const challengeData = await challengeRes.json()

      if (!challengeRes.ok) {
        throw new Error(challengeData.error || 'Failed to get challenge')
      }

      // 2. Sign with wallet adapter
      const signResult = await signMessage({
        message: challengeData.message,
        nonce: challengeData.nonce,
      })

      // 3. Verify on server
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          signature: {
            publicKey: signResult.publicKey || signResult.prefix || '',
            signature: signResult.signature || '',
          },
          message: challengeData.message,
        }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Authentication failed')
      }

      // 4. Store session
      setToken(verifyData.token)
      setSavedAddress(addr)
      localStorage.setItem(TOKEN_KEY, verifyData.token)
      localStorage.setItem(WALLET_KEY, addr)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const connect = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      // Find Petra wallet in available wallets
      const petra = wallets?.find(w =>
        w.name.toLowerCase().includes('petra')
      )

      if (petra) {
        await aptosConnect(petra.name)
      } else if (wallets?.length > 0) {
        // Connect to first available wallet
        await aptosConnect(wallets[0].name)
      } else {
        throw new Error('No Aptos wallet found. Please install Petra.')
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [wallets, aptosConnect])

  const disconnect = useCallback(() => {
    setToken(null)
    setSavedAddress(null)
    setError(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(WALLET_KEY)
    aptosDisconnect()
  }, [aptosDisconnect])

  const authHeaders = useCallback(() => {
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [token])

  const hasWallet = wallets && wallets.length > 0

  const value = {
    address,
    token,
    connected,
    loading,
    error,
    hasPetra: hasWallet,
    connect,
    disconnect,
    authHeaders,
    wallets,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/** Top-level provider wrapping AptosWalletAdapterProvider + AuthProvider */
export function WalletProvider({ children }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      dappConfig={{ network: 'testnet' }}
      onError={(error) => console.error('Wallet adapter error:', error)}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </AptosWalletAdapterProvider>
  )
}

export function useWallet() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
