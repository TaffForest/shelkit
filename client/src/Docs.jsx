import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Docs.css'

const sections = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'build-with-ai', title: 'Build with AI' },
  { id: 'upload-github', title: 'Upload & GitHub' },
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
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
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
              ShelKit takes a website from idea or ZIP to a live URL on decentralised storage. Two paths in, one destination: <strong>Shelby's content-addressed storage network</strong>.
            </p>

            <h3>Pick a path</h3>
            <p>After connecting your Petra wallet at <Code>/app</Code>, you choose how to start:</p>
            <ol className="docs-steps">
              <li>
                <strong>Build with AI</strong> — Describe a site in plain English. Chat with our AI to iterate. Deploy when it looks right. Best when you don't have a site yet.
              </li>
              <li>
                <strong>Upload a site</strong> — Drop a ZIP of your build output or paste a GitHub repo URL. Best when you've already got something.
              </li>
            </ol>
            <p>
              Both flows end the same way: a fresh subdomain on <Code>shelkit.forestinfra.com</Code>, files pinned to Shelby, a sharable URL, and an entry in your <Link to="/dashboard">Dashboard</Link>.
            </p>

            <h3>Prerequisites</h3>
            <ul>
              <li><a href="https://petra.app" target="_blank" rel="noopener noreferrer">Petra wallet</a> browser extension, set to <strong>Testnet</strong> network</li>
              <li>That's it. No accounts to create. No credit card.</li>
            </ul>

            <h3>What can I deploy?</h3>
            <p>Any static frontend that compiles to HTML, CSS, and JS:</p>
            <ul>
              <li>Anything the AI builder generates (one self-contained <Code>index.html</Code> with optional Tailwind via CDN)</li>
              <li>React, Vue, Svelte, Angular (after <Code>npm run build</Code>)</li>
              <li>Next.js, Nuxt, Astro (static export)</li>
              <li>Plain HTML/CSS/JS</li>
              <li>Any static site generator (Hugo, Jekyll, Gatsby)</li>
            </ul>
            <p>
              For uploads you can also drop raw source code with a <Code>package.json</Code> — ShelKit will run <Code>npm install</Code> and <Code>npm run build</Code> on the server.
            </p>

            <h3>File size limit</h3>
            <p>ZIP uploads are accepted up to <strong>100 MB</strong>. Most production frontend builds are well under 10 MB. AI-generated sites are typically 15–40 kB.</p>
          </section>

          {/* Build with AI */}
          <section id="build-with-ai">
            <h1>Build with AI</h1>
            <p className="docs-lead">
              ShelKit's AI builder generates a complete, self-contained website from a description in plain English. Iterate by chat. Deploy in one click.
            </p>

            <h3>Start a build</h3>
            <ol className="docs-steps">
              <li>Visit <Code>/build</Code> directly, or pick "Build with AI" from the chooser at <Code>/app</Code>.</li>
              <li>Connect your Petra wallet if you haven't.</li>
              <li>Type a description of the site you want. Press <Code>⌘+↵</Code> (or <Code>Ctrl+↵</Code>) to send.</li>
              <li>Wait 20-90 seconds for the first generation. Iterate by sending follow-up messages.</li>
              <li>Click <strong>Deploy to Shelby</strong> when you're happy. Your site lands on a fresh subdomain.</li>
            </ol>

            <h3>Writing a good prompt</h3>
            <p>The more specific you are, the better the first draft. Aim for a single sentence or two that names:</p>
            <ul>
              <li><strong>The subject</strong> — what's the site for? A coffee roaster? A musician? A SaaS landing?</li>
              <li><strong>The audience</strong> — who's reading it? Customers? Investors? Fans?</li>
              <li><strong>The sections you want</strong> — bio, gallery, contact form, pricing tiers, etc.</li>
              <li><strong>The tone</strong> — editorial, technical, warm, playful, minimal</li>
            </ul>
            <p>Examples of prompts that produce strong first drafts:</p>
            <CodeBlock title="Good prompts">{`A portfolio site for a freelance illustrator with a gallery and contact form.

A landing page for a SaaS that helps developers manage cron jobs.

A menu and ordering page for a Pembrokeshire pizza place.

A link-in-bio page for a crypto YouTuber.

A pitch deck site for a stealth-stage AI startup.`}</CodeBlock>
            <p>
              See the <Link to="/gallery">Gallery</Link> for examples of what the builder produces.
            </p>

            <h3>Iterating</h3>
            <p>After the first generation, type follow-up messages to refine the site. The AI keeps the existing palette, typography, and structure unless you explicitly ask for a change:</p>
            <CodeBlock title="Edit examples">{`Make the hero darker.
Add a testimonials section before the footer.
Swap the headline for "Coffee, considered."
Change the accent colour to a warmer red.
Remove the "How it works" section.`}</CodeBlock>

            <h3>What the AI can produce</h3>
            <ul>
              <li>A single self-contained <Code>index.html</Code> with inline CSS and JS</li>
              <li>Tailwind utility classes via the CDN — no build step</li>
              <li>Google Fonts (Playfair Display, Fraunces, Space Grotesk, etc.) loaded via <Code>&lt;link&gt;</Code></li>
              <li>Custom palettes and typography matched to your subject</li>
              <li>Placeholder images via <Code>picsum.photos</Code> with descriptive seeds</li>
              <li>Inline SVG for logos, avatars, icons, decorative compositions</li>
              <li>Accessible HTML (semantic landmarks, alt text, WCAG AA contrast)</li>
              <li>Mobile-responsive layouts by default</li>
            </ul>

            <h3>What the AI won't produce</h3>
            <ul>
              <li>Multi-page sites or sites with a build step</li>
              <li>JavaScript frameworks (React, Vue, etc.) — output is plain HTML</li>
              <li>Server-side anything (no form submissions, no APIs, no databases)</li>
              <li>User-uploaded images (yet — coming in a future version; for now the AI uses placeholders)</li>
              <li>Multi-file output (v1 limitation; the builder emits one HTML file)</li>
            </ul>

            <h3>Session lifetime</h3>
            <p>
              Each generation creates an in-memory session keyed by a 16-character ID. Sessions live for <strong>10 minutes from the last write</strong>. After deploy, the session is no longer needed — your deployment is permanent on Shelby. If you walk away mid-chat and come back after 10+ minutes, you'll need to start a new session.
            </p>
            <p>
              Conversation history lives in browser memory (not localStorage in v1). Refreshing the page loses the conversation but the server-side session persists until the TTL expires.
            </p>

            <h3>Rate limits</h3>
            <p>
              The builder is rate-limited to <strong>15 calls per 10 minutes per wallet</strong>. That covers a normal session (one generation plus ~10 iterations) comfortably. When you hit the limit you get a 429 response with a <Code>Retry-After</Code> header.
            </p>

            <h3>Cost</h3>
            <p>Free on testnet. Each generation runs Claude Sonnet 4.6 under the hood; you don't need an Anthropic key, ShelKit handles that.</p>

            <h3>Deploy</h3>
            <p>
              Click <strong>Deploy to Shelby</strong> in the bar above the preview. The ZIP is built client-side (just the single <Code>index.html</Code>) and POSTed to the same <Code>/api/deploy</Code> endpoint that uploads use. You get a fresh subdomain, the deployment shows up in your Dashboard, and the URL is sharable immediately.
            </p>
            <p>
              Each "Deploy again" creates a new deployment with a new subdomain. There's no in-place versioning yet — that's coming in a later release. Manage previous deployments via the <Link to="/dashboard">Dashboard</Link>.
            </p>
          </section>

          {/* Upload & GitHub */}
          <section id="upload-github">
            <h1>Upload & GitHub</h1>
            <p className="docs-lead">
              If you've already built a site, ShelKit can take a ZIP of the build output OR a GitHub repo URL and ship it to Shelby.
            </p>

            <h3>ZIP upload</h3>
            <ol className="docs-steps">
              <li>Visit <Code>/upload</Code> directly, or pick "Upload a site" from the chooser at <Code>/app</Code>.</li>
              <li>Drag a ZIP onto the drop zone (or click to browse).</li>
              <li>Optionally set a custom subdomain and an expiry date.</li>
              <li>Click <strong>Deploy</strong>. ShelKit extracts the ZIP, runs content checks, pins every file to Shelby, and gives you a URL.</li>
            </ol>
            <p>What goes in the ZIP: the contents of your build output directory, NOT the directory itself. <Code>index.html</Code> should be at the top level.</p>

            <h3>GitHub deploy</h3>
            <ol className="docs-steps">
              <li>Switch to the <strong>GitHub Repo</strong> tab in the upload UI.</li>
              <li>Paste your repository URL: <Code>https://github.com/owner/repo</Code></li>
              <li>ShelKit shallow-clones the repo, detects the framework, runs the build server-side, and deploys.</li>
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

            <h3>GitHub requirements</h3>
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
              All authenticated endpoints require a JWT token in the <Code>Authorization</Code> header. Serving deployed files is public.
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

            <h3>Build with AI</h3>
            <p>Rate-limited to <strong>15 calls per 10 minutes per wallet</strong> via <Code>Retry-After</Code>-aware <Code>429</Code> responses. Both endpoints require auth.</p>

            <CodeBlock title="POST /api/build/generate">{`// Request
{ "prompt": "A coming-soon page for a typewriter repair shop." }

// Response
{
  "sessionId": "16-char nanoid",
  "previewUrl": "/api/build/preview/<sessionId>/index.html",
  "files": ["index.html"],
  "assistantMessage": "A warm, typewriter-themed coming-soon page..."
}

// Failure shapes
// 502 { error, code: "empty_files" | "no_tool_call" }   <- retryable
// 500 { error, code: "auth" }                           <- server config
// 429 { error, code: "rate_limited_client" }            <- wait the window`}</CodeBlock>

            <CodeBlock title="POST /api/build/edit">{`// Request
{
  "sessionId": "<from generate>",
  "instruction": "Make the hero darker. Add a testimonials section.",
  "conversation": [
    { "role": "user", "text": "...the original prompt..." },
    { "role": "assistant", "text": "...the assistant's summary..." }
    // ... prior turns
  ]
}

// Response: same shape as /generate, same sessionId, refreshed 10-min TTL.
// 404 { error } if the session has expired.`}</CodeBlock>

            <CodeBlock title="GET /api/build/preview/:sessionId/*">{`// Public, no auth — the sessionId is unguessable
// Serves files from the in-memory preview store
// Strict CSP: sandbox, connect-src 'none', frame-ancestors 'self'
// Cache-Control: no-store so iframe reloads pick up edits`}</CodeBlock>

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
            <p>
              Every deployment gets an auto-generated subdomain like <Code>{`<id>.shelkit.forestinfra.com`}</Code>. You can request a specific name during deploy. If it's taken, a short random suffix is appended.
            </p>

            <h3>Custom domains (BYOD)</h3>
            <p>Already own a domain? Point it at your ShelKit deployment in three steps.</p>

            <h4>1. Add the domain in the dashboard</h4>
            <p>
              From <Link to="/dashboard">your Dashboard</Link>, find the deployment and click <strong>Add Custom Domain</strong>. Enter the domain you want to point at it (<Code>example.com</Code> or <Code>www.example.com</Code>).
            </p>

            <h4>2. Configure DNS</h4>
            <p>Add a CNAME record at your DNS provider:</p>
            <table className="docs-table">
              <thead><tr><th>Type</th><th>Name</th><th>Target</th></tr></thead>
              <tbody>
                <tr><td>CNAME</td><td><Code>example.com</Code></td><td><Code>shelkit.forestinfra.com</Code></td></tr>
              </tbody>
            </table>
            <p>SSL is issued automatically by Let's Encrypt within a couple of minutes of the DNS record propagating.</p>

            <h4>3. Visit your domain</h4>
            <p>Once DNS propagates and the cert lands, your custom domain serves the deployment. Existing subdomain URLs keep working alongside.</p>

            <h3>API</h3>
            <CodeBlock title="POST /api/domains">{`// Request
{ "domain": "example.com", "deploymentId": "abc123" }

// Response
{
  "success": true,
  "domain": "example.com",
  "deploymentId": "abc123",
  "cname": "shelkit.forestinfra.com",
  "ssl": "Auto-provisioning SSL certificate — may take a few minutes."
}`}</CodeBlock>

            <CodeBlock title="GET /api/domains">{`// Headers: Authorization: Bearer <token>
// Response: Array of custom-domain mappings owned by your wallet`}</CodeBlock>

            <CodeBlock title="DELETE /api/domains/:domain">{`// Headers: Authorization: Bearer <token>
// Response
{ "success": true }`}</CodeBlock>
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
              ShelKit includes built-in safeguards to keep the platform safe for everyone. Both uploaded and AI-generated sites pass through the same checks before they land on Shelby.
            </p>

            <h3>Content policy</h3>
            <p>All deployments are scanned before pinning. The following are blocked:</p>
            <ul>
              <li>Executable files (<Code>.exe</Code>, <Code>.sh</Code>, <Code>.php</Code>, <Code>.py</Code>, etc.)</li>
              <li>Known malicious filenames (webshells, backdoors, etc.)</li>
              <li>Files that trigger antivirus heuristics</li>
            </ul>
            <p>Deployments that violate the content policy are rejected immediately and never pinned to Shelby. This applies to AI-generated output just like ZIP uploads — the AI builder doesn't get a free pass.</p>

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
              Wallets or individual deployments found to be in breach of the content policy can be suspended by admins. Suspended deployments return a <Code>403 Suspended</Code> response. Suspended wallets cannot create new deployments or run the AI builder.
            </p>

            <h3>npm audit</h3>
            <p>
              When ShelKit runs a server-side build (GitHub deploy or source upload), it performs an <Code>npm audit</Code> after install. Builds with <strong>critical</strong> severity vulnerabilities are blocked. High and below produce a warning but do not block the deploy.
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
              <li>An <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">Anthropic API key</a> if you want the AI builder feature</li>
            </ul>

            <h3>1. Clone and configure</h3>
            <CodeBlock title="Terminal">{`git clone https://github.com/TaffForest/shelkit.git
cd shelkit
cp .env.example .env.production`}</CodeBlock>

            <h3>2. Set environment variables</h3>
            <CodeBlock title=".env.production">{`# Required
JWT_SECRET=<openssl rand -hex 32>
BASE_DOMAIN=shelkit.yourdomain.com
SHELBY_API_KEY=AG-your-key
SHELBY_PRIVATE_KEY=0xyour-private-key
SHELBY_NETWORK=testnet
BLOB_EXPIRY_DAYS=365

# Required for AI builder (omit to disable the /build feature)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional — defaults shown
ANTHROPIC_MODEL=claude-sonnet-4-6
AI_PROVIDER=anthropic

# Required for wildcard SSL via Cloudflare DNS-01
CF_KEY=your-cloudflare-global-api-key
CF_EMAIL=your-cloudflare-account-email`}</CodeBlock>
            <p>
              <Code>ANTHROPIC_API_KEY</Code> has no default — if it's not set, every call to <Code>/api/build/generate</Code> will fail loud. If you don't want to ship the AI builder, leave it out and remove the <Code>/build</Code> route from <Code>App.jsx</Code>.
            </p>

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
              Wildcard certs (<Code>*.shelkit.yourdomain.com</Code>) require DNS-01 challenge. ShelKit uses the Cloudflare API to set DNS TXT records automatically. Add these to your <Code>.env.production</Code>:
            </p>
            <CodeBlock title=".env.production">{`CF_KEY=your-cloudflare-global-api-key
CF_EMAIL=your-cloudflare-account-email`}</CodeBlock>
            <p>Your Cloudflare Global API Key is found under <strong>My Profile → API Tokens → Global API Key</strong>. The domain must be managed by this Cloudflare account.</p>

            <h3>5. Deploy</h3>
            <CodeBlock title="Terminal">{`bash scripts/deploy.sh`}</CodeBlock>
            <p>
              SSL certificates are issued automatically by Let's Encrypt via <Code>nginx-proxy</Code> and <Code>acme-companion</Code>. Both the root domain and wildcard are covered — no manual cert steps required.
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
