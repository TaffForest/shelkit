import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Docs.css'

const sections = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'cli', title: 'CLI Usage' },
  { id: 'github-deploy', title: 'GitHub Deploy' },
  { id: 'api', title: 'API Reference' },
  { id: 'custom-domains', title: 'Custom Domains' },
  { id: 'wallet-auth', title: 'Wallet Auth' },
  { id: 'safety', title: 'Safety & Moderation' },
  { id: 'self-hosting', title: 'Self-Hosting' },
]

function Code({ children }) {
  return <code className="docs-inline-code">{children}</code>
}

function CodeBlock({ children, title }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="docs-codeblock">
      {title && <div className="docs-codeblock-title">{title}</div>}
      <button className="docs-copy-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      <pre><code>{children}</code></pre>
    </div>
  )
}

export default function Docs() {
  const location = useLocation()
  const [active, setActive] = useState('getting-started')

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) {
      setActive(hash)
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.hash])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="docs-page">
      <nav className="deploy-nav">
        <Link to="/" className="deploy-nav-brand">
          <span>Shel<span className="accent">Kit</span></span>
        </Link>
        <div className="deploy-nav-links">
          <Link to="/docs" className="active">Docs</Link>
          <Link to="/app" className="nav-cta">Launch App</Link>
        </div>
      </nav>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-title">Documentation</div>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`docs-sidebar-link ${active === s.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                setActive(s.id)
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              {s.title}
            </a>
          ))}
        </aside>

        <main className="docs-content">
          {/* Getting Started */}
          <section id="getting-started">
            <h1>Getting Started</h1>
            <p className="docs-lead">
              ShelKit is a 1-click deploy tool for the decentralised web. Upload your frontend build, and we pin it to Shelby's storage network. Your site is live in seconds.
            </p>

            <h3>Quick deploy in 3 steps</h3>
            <ol className="docs-steps">
              <li>
                <strong>Connect wallet</strong> — Click "Launch App" and connect your Petra wallet.
              </li>
              <li>
                <strong>Upload</strong> — Drag and drop a ZIP of your build output (or paste a GitHub URL).
              </li>
              <li>
                <strong>Live</strong> — Your site is deployed and pinned to the Shelby network. You get a URL instantly.
              </li>
            </ol>

            <h3>What can I deploy?</h3>
            <p>Any static frontend that compiles to HTML, CSS, and JS:</p>
            <ul>
              <li>React, Vue, Svelte, Angular (after <Code>npm run build</Code>)</li>
              <li>Next.js, Nuxt, Astro (static export)</li>
              <li>Plain HTML/CSS/JS</li>
              <li>Any static site generator (Hugo, Jekyll, Gatsby)</li>
            </ul>
            <p>
              You can also upload raw source code with a <Code>package.json</Code> — ShelKit will run <Code>npm install</Code> and <Code>npm run build</Code> on the server.
            </p>

            <h3>File size limit</h3>
            <p>ZIP uploads are accepted up to <strong>100 MB</strong>. Most production frontend builds are well under 10 MB.</p>
          </section>

          {/* CLI Usage */}
          <section id="cli">
            <h1>CLI Usage</h1>
            <p className="docs-lead">
              Deploy from your terminal with the ShelKit CLI.
            </p>

            <h3>Install</h3>
            <CodeBlock title="Terminal">{`npm install -g shelkit`}</CodeBlock>

            <h3>Login</h3>
            <p>Authenticate with your Petra wallet. This opens a browser window.</p>
            <CodeBlock title="Terminal">{`shelkit login`}</CodeBlock>
            <p>Your token is saved to <Code>~/.shelkit/config.json</Code>.</p>

            <h3>Deploy a directory</h3>
            <CodeBlock title="Terminal">{`# Deploy pre-built static files
shelkit deploy ./dist

# Deploy source code (server builds it)
shelkit deploy ./my-app --build`}</CodeBlock>

            <h3>List deployments</h3>
            <CodeBlock title="Terminal">{`shelkit list`}</CodeBlock>

            <h3>Delete a deployment</h3>
            <CodeBlock title="Terminal">{`shelkit delete <deployment-id>`}</CodeBlock>

            <h3>Options</h3>
            <table className="docs-table">
              <thead><tr><th>Flag</th><th>Description</th><th>Default</th></tr></thead>
              <tbody>
                <tr><td><Code>-s, --server</Code></td><td>ShelKit server URL</td><td><Code>https://shelkit.forestinfra.com</Code></td></tr>
                <tr><td><Code>--build</Code></td><td>Upload source and build server-side</td><td><Code>false</Code></td></tr>
              </tbody>
            </table>
          </section>

          {/* GitHub Deploy */}
          <section id="github-deploy">
            <h1>GitHub Deploy</h1>
            <p className="docs-lead">
              Deploy directly from a GitHub repository URL.
            </p>

            <h3>How it works</h3>
            <ol className="docs-steps">
              <li>Click the "GitHub Repo" tab in the deploy UI.</li>
              <li>Paste your repository URL: <Code>https://github.com/owner/repo</Code></li>
              <li>ShelKit shallow-clones the repo, detects the framework, runs the build, and deploys.</li>
            </ol>

            <h3>Supported frameworks</h3>
            <p>ShelKit auto-detects the build tool and output directory:</p>
            <table className="docs-table">
              <thead><tr><th>Framework</th><th>Output directory</th></tr></thead>
              <tbody>
                <tr><td>Vite (React, Vue, Svelte)</td><td><Code>dist/</Code></td></tr>
                <tr><td>Create React App</td><td><Code>build/</Code></td></tr>
                <tr><td>Next.js (static export)</td><td><Code>out/</Code></td></tr>
                <tr><td>Astro</td><td><Code>dist/</Code></td></tr>
                <tr><td>Gatsby</td><td><Code>public/</Code></td></tr>
              </tbody>
            </table>

            <h3>Requirements</h3>
            <ul>
              <li>Repository must be public</li>
              <li>Must have a <Code>package.json</Code> with a <Code>build</Code> script</li>
              <li>Default branch is <Code>main</Code> (falls back to default if not found)</li>
            </ul>
          </section>

          {/* API Reference */}
          <section id="api">
            <h1>API Reference</h1>
            <p className="docs-lead">
              All endpoints require a JWT token in the <Code>Authorization</Code> header (except serving deployed files).
            </p>

            <h3>Authentication</h3>
            <CodeBlock title="POST /api/auth/challenge">{`// Request
{ "address": "0x..." }

// Response
{ "nonce": "abc123", "message": "Sign this message..." }`}</CodeBlock>

            <CodeBlock title="POST /api/auth/verify">{`// Request
{
  "address": "0x...",
  "signature": { "publicKey": "...", "signature": "..." },
  "message": "Sign this message...",
  "fullMessage": "APTOS\\nmessage: ...\\nnonce: ..."
}

// Response
{ "token": "eyJ...", "wallet": "0x..." }`}</CodeBlock>

            <h3>Deploy</h3>
            <CodeBlock title="POST /api/deploy">{`// Multipart form upload
// Field: file (ZIP)
// Headers: Authorization: Bearer <token>

// Response
{
  "deploymentId": "abc123",
  "url": "/deploy/abc123",
  "rootCID": "bafy_root_...",
  "fileCount": 12,
  "subdomain": "abc123",
  "framework": "vite",
  "didBuild": true
}`}</CodeBlock>

            <CodeBlock title="POST /api/deploy/github">{`// Request
{ "repoUrl": "https://github.com/owner/repo", "branch": "main" }

// Response (same as above, plus)
{ "source": "github", "repo": "repo-name" }`}</CodeBlock>

            <h3>Deployments</h3>
            <CodeBlock title="GET /api/deployments">{`// Headers: Authorization: Bearer <token>
// Response: Array of deployment objects`}</CodeBlock>

            <CodeBlock title="DELETE /api/deployments/:id">{`// Headers: Authorization: Bearer <token>
// Response
{ "success": true, "message": "Deployment deleted" }`}</CodeBlock>

            <h3>Serving</h3>
            <CodeBlock title="GET /deploy/:id">{`// Serves the deployed site (no auth required)
// SPA fallback: unknown routes serve index.html`}</CodeBlock>
          </section>

          {/* Custom Domains */}
          <section id="custom-domains">
            <h1>Custom Domains</h1>
            <p className="docs-lead">
              Give your deployed sites a custom subdomain or bring your own domain.
            </p>

            <h3>Custom subdomains</h3>
            <p>When deploying, you can choose a custom subdomain instead of a random ID:</p>
            <ol className="docs-steps">
              <li>Upload your ZIP or paste a GitHub URL.</li>
              <li>Type your desired subdomain in the "Custom subdomain" field (e.g. <Code>my-app</Code>).</li>
              <li>Your site will be live at <Code>https://my-app.shelkit.forestinfra.com</Code>.</li>
            </ol>
            <p>Subdomain rules: lowercase letters, numbers, and hyphens only. If your chosen subdomain is already taken, ShelKit will automatically append a short suffix (e.g. <Code>my-app-x3k2</Code>) rather than throwing an error.</p>

            <h3>Custom domains (BYOD)</h3>
            <p>Point your own domain to a ShelKit deployment:</p>

            <h4>1. Add the domain in the dashboard</h4>
            <p>Go to <strong>Deployments</strong>, find your deployment, and type your domain in the "Add custom domain" field (e.g. <Code>mysite.com</Code>).</p>

            <h4>2. Configure DNS</h4>
            <p>Add a CNAME record at your domain registrar:</p>
            <table className="docs-table">
              <thead><tr><th>Type</th><th>Name</th><th>Target</th></tr></thead>
              <tbody>
                <tr><td>CNAME</td><td><Code>mysite.com</Code> (or <Code>@</Code>)</td><td><Code>shelkit.forestinfra.com</Code></td></tr>
              </tbody>
            </table>
            <p>DNS propagation can take up to 24 hours, but usually completes within minutes.</p>

            <h4>3. Visit your domain</h4>
            <p>Once DNS propagates, visiting <Code>mysite.com</Code> will serve your deployed site.</p>

            <h3>API</h3>
            <CodeBlock title="POST /api/domains">{`// Add a custom domain
{
  "domain": "mysite.com",
  "deploymentId": "abc123"
}

// Response
{
  "success": true,
  "domain": "mysite.com",
  "cname": "shelkit.forestinfra.com"
}`}</CodeBlock>

            <CodeBlock title="DELETE /api/domains/:domain">{`// Remove a custom domain
// Response
{ "success": true }`}</CodeBlock>

            <CodeBlock title="GET /api/domains">{`// List your custom domains
// Response: Array of { domain, deployment_id, wallet, created_at }`}</CodeBlock>
          </section>

          {/* Wallet Auth */}
          <section id="wallet-auth">
            <h1>Wallet Auth</h1>
            <p className="docs-lead">
              ShelKit uses Petra wallet (Aptos) for authentication. No passwords, no accounts — just your wallet.
            </p>

            <h3>How it works</h3>
            <ol className="docs-steps">
              <li>Client requests a challenge nonce from the server.</li>
              <li>User signs the challenge message with their Petra wallet.</li>
              <li>Server verifies the Ed25519 signature against the wallet's public key.</li>
              <li>Server issues a JWT token (valid for 24 hours).</li>
            </ol>

            <h3>Requirements</h3>
            <ul>
              <li><a href="https://petra.app/" target="_blank" rel="noopener noreferrer">Petra wallet</a> browser extension (desktop)</li>
              <li>Wallet set to <strong>Testnet</strong> network</li>
            </ul>

            <h3>Mobile</h3>
            <p>
              On mobile, the Petra browser extension is not available. Instead, open ShelKit inside the <strong>Petra mobile app's built-in browser</strong> — the wallet connect button will work there automatically.
            </p>

            <h3>Token storage</h3>
            <p>
              The JWT is stored in <Code>localStorage</Code> under <Code>shelkit_token</Code>.
              It expires after 24 hours. Disconnect your wallet to clear the token.
            </p>
          </section>

          {/* Safety & Moderation */}
          <section id="safety">
            <h1>Safety &amp; Moderation</h1>
            <p className="docs-lead">
              ShelKit includes built-in safeguards to keep the platform safe for everyone.
            </p>

            <h3>Content policy</h3>
            <p>All uploads are scanned before deployment. The following are blocked:</p>
            <ul>
              <li>Executable files (<Code>.exe</Code>, <Code>.sh</Code>, <Code>.php</Code>, <Code>.py</Code>, etc.)</li>
              <li>Known malicious filenames (webshells, backdoors, etc.)</li>
              <li>Files that trigger antivirus heuristics</li>
            </ul>
            <p>Deployments that violate the content policy are rejected immediately and never pinned to Shelby.</p>

            <h3>Reporting abuse</h3>
            <p>
              Every deployed site includes a discreet abuse reporting banner. If you encounter a site that violates the content policy, click <strong>"Report"</strong> or use the API directly:
            </p>
            <CodeBlock title="POST /api/report">{`{
  "deploymentId": "abc123",
  "reason": "malware" // or: "phishing", "illegal", "spam", "other"
}`}</CodeBlock>
            <p>Reports are rate-limited to 5 per hour per IP. Repeated abuse reports trigger manual review.</p>

            <h3>Account &amp; deployment suspension</h3>
            <p>
              Wallets or individual deployments found to be in breach of the content policy can be suspended by admins. Suspended deployments return a <Code>403 Suspended</Code> response. Suspended wallets cannot create new deployments.
            </p>

            <h3>npm audit</h3>
            <p>
              When ShelKit runs a server-side build, it performs an <Code>npm audit</Code> after install. Builds with <strong>critical</strong> severity vulnerabilities are blocked. High and below produce a warning but do not block the deploy.
            </p>
          </section>

          {/* Self-Hosting */}
          <section id="self-hosting">
            <h1>Self-Hosting</h1>
            <p className="docs-lead">
              Run your own ShelKit instance with Docker.
            </p>

            <h3>Prerequisites</h3>
            <ul>
              <li>Docker and Docker Compose</li>
              <li>A domain with DNS access</li>
              <li>Shelby API key from <a href="https://geomi.dev" target="_blank" rel="noopener noreferrer">geomi.dev</a></li>
              <li>Shelby account private key (for signing blob uploads)</li>
            </ul>

            <h3>1. Clone and configure</h3>
            <CodeBlock title="Terminal">{`git clone https://github.com/TaffForest/shelkit.git
cd shelkit
cp .env.example .env`}</CodeBlock>

            <h3>2. Set environment variables</h3>
            <CodeBlock title=".env">{`JWT_SECRET=<openssl rand -hex 32>
BASE_DOMAIN=shelkit.yourdomain.com
SHELBY_API_KEY=AG-your-key
SHELBY_PRIVATE_KEY=0xyour-private-key
SHELBY_NETWORK=shelbynet
BLOB_EXPIRY_DAYS=365`}</CodeBlock>

            <h3>3. DNS records</h3>
            <p>You need both an A record for the root domain and a wildcard A record for subdomains:</p>
            <table className="docs-table">
              <thead><tr><th>Type</th><th>Name</th><th>Target</th></tr></thead>
              <tbody>
                <tr><td>A</td><td><Code>shelkit.yourdomain.com</Code></td><td>Your server IP</td></tr>
                <tr><td>A</td><td><Code>*.shelkit.yourdomain.com</Code></td><td>Your server IP</td></tr>
              </tbody>
            </table>

            <h3>4. Cloudflare DNS credentials (for wildcard SSL)</h3>
            <p>
              Wildcard certs (<Code>*.shelkit.yourdomain.com</Code>) require DNS-01 challenge. ShelKit uses the Cloudflare API to set DNS TXT records automatically. Add these to your <Code>.env</Code>:
            </p>
            <CodeBlock title=".env">{`CF_KEY=your-cloudflare-global-api-key
CF_EMAIL=your-cloudflare-account-email`}</CodeBlock>
            <p>Your Cloudflare Global API Key is found under <strong>My Profile → API Tokens → Global API Key</strong>. The domain must be managed by this Cloudflare account.</p>

            <h3>5. Deploy</h3>
            <CodeBlock title="Terminal">{`docker compose up -d --build`}</CodeBlock>
            <p>
              SSL certificates are issued automatically by Let's Encrypt via <Code>nginx-proxy</Code> and <Code>acme-companion</Code>. Both the root domain and wildcard are covered — no manual cert steps required.
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
