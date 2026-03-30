import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <span>Shel<span className="accent">Kit</span></span>
          </a>
          <div className="nav-links">
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}>Features</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }) }}>How it works</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }) }}>Pricing</a>
            <Link to="/docs">Docs</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/app" className="nav-cta">Launch App</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Deploy to the <em>decentralised</em> web<br />in one click
        </h1>
        <p className="hero-sub">
          No servers. No config. No DevOps.<br />
          Just drag, drop, and your site is live — forever.
        </p>
        <div className="hero-actions">
          <Link to="/app" className="btn-primary">Deploy now</Link>
          <a href="#how-it-works" className="btn-secondary">Learn more</a>
        </div>
        <div className="hero-badges">
          <span className="badge">Powered by ShelPin</span>
          <span className="badge">Decentralised</span>
          <span className="badge">Permanent Storage</span>
        </div>
      </section>

      {/* Built With */}
      <section className="partners">
        <h3 className="partners-label">Built With</h3>
        <div className="partners-logos">
          <div className="partner-item">
            <div className="partner-mark">
              <img src="/shelby-logo.svg" alt="Shelby" className="partner-img-shelby" />
            </div>
            <span>Decentralised Hot Storage</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark">
              <img src="/aptos-logo.png" alt="Aptos" className="partner-img-aptos" />
            </div>
            <span>Layer 1 Blockchain</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark partner-mark-forest">
              <img src="/forest-icon.png" alt="Forest" className="partner-img-forest" />
              <span className="forest-text">Forest</span>
            </div>
            <span>Infrastructure</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" id="how-it-works">
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">Three steps. Under a minute.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>ZIP your build</h3>
            <p>Run your build tool, then ZIP the output folder. That's it.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>We pin it</h3>
            <p>Every file is uploaded to ShelPin's decentralised storage network.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>It's live</h3>
            <p>Instant URL. Your site is served from the decentralised web, permanently.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <h2 className="section-title">Why ShelKit?</h2>
        <p className="section-sub">Everything you need. Nothing you don't.</p>
        <div className="features-grid">
          <div className="feature-card">
            <h3>One-click deploy</h3>
            <p>No CLI, no Git hooks, no CI/CD pipelines. Just upload and go.</p>
          </div>
          <div className="feature-card">
            <h3>Decentralised hosting</h3>
            <p>Powered by ShelPin and Shelby. Your files live on a distributed network.</p>
          </div>
          <div className="feature-card">
            <h3>Permanent URLs</h3>
            <p>Content-addressed storage means your site never goes down or gets lost.</p>
          </div>
          <div className="feature-card">
            <h3>SPA support</h3>
            <p>Automatic index.html fallback for React, Vue, and all single-page apps.</p>
          </div>
          <div className="feature-card">
            <h3>Instant preview</h3>
            <p>Get a live URL in seconds. Share it immediately with your team.</p>
          </div>
          <div className="feature-card">
            <h3>Zero config</h3>
            <p>No YAML files. No build scripts. No environment variables to set up.</p>
          </div>
          <div className="feature-card">
            <h3>Bring your own domain</h3>
            <p>Point any domain you own to a ShelKit deployment. Add a CNAME and you're done — SSL included.</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="section" id="compare">
        <h2 className="section-title">The old way vs the ShelKit way</h2>
        <div className="compare-grid">
          <div className="compare-card compare-old">
            <div className="compare-header">
              <span className="compare-x">✕</span>
              Traditional deploy
            </div>
            <div className="compare-steps">
              <code>1. Set up cloud account</code>
              <code>2. Configure CLI tools</code>
              <code>3. Write build config</code>
              <code>4. Set up CI/CD pipeline</code>
              <code>5. Configure DNS</code>
              <code>6. Set up SSL certificates</code>
              <code>7. Write deployment scripts</code>
              <code>8. Debug environment vars</code>
              <code>9. Wait for propagation</code>
              <code>10. Pray it works</code>
            </div>
          </div>
          <div className="compare-card compare-new">
            <div className="compare-header">
              <span className="compare-check">✓</span>
              ShelKit
            </div>
            <div className="compare-steps">
              <code>1. ZIP your build folder</code>
              <code>2. Drop it on ShelKit</code>
              <code>3. Done. It's live.</code>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section" id="pricing">
        <h2 className="section-title">Pricing</h2>
        <p className="section-subtitle">Free on testnet. Mainnet pricing coming soon.</p>

        <div className="pricing-cards">
          <div className="pricing-card">
            <div className="pricing-tier">Testnet</div>
            <div className="pricing-price">Free</div>
            <div className="pricing-desc">Available now</div>
            <ul className="pricing-features">
              <li>Unlimited deploys</li>
              <li>Server-side builds</li>
              <li>GitHub integration</li>
              <li>Custom subdomains</li>
              <li>Bring your own domain</li>
              <li>CLI access</li>
            </ul>
            <Link to="/app" className="btn-primary">Start deploying</Link>
          </div>

          <div className="pricing-card pricing-card-main">
            <div className="pricing-tier">Mainnet</div>
            <div className="pricing-price">TBD</div>
            <div className="pricing-desc">Coming soon</div>
            <ul className="pricing-features">
              <li>Permanent decentralised storage</li>
              <li>Production-grade hosting</li>
              <li>Priority builds</li>
              <li>Team collaboration</li>
              <li>Advanced analytics</li>
            </ul>
            <span className="btn-outline btn-disabled">Coming soon</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to deploy?</h2>
        <p>Your next site is one drag-and-drop away.</p>
        <Link to="/app" className="btn-primary btn-lg">Deploy now</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span>Shel<span className="accent">Kit</span></span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <Link to="/docs">Docs</Link>
            <Link to="/app">Launch App</Link>
          </div>
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} ShelKit. Powered by ShelPin.
          </div>
        </div>
      </footer>
    </div>
  )
}
