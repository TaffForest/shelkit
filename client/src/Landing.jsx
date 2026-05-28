import { Link } from 'react-router-dom'
import { useState } from 'react'
import './Landing.css'

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const scrollTo = (id) => { closeMenu(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <span>Shel<span className="accent">Kit</span></span>
          </a>
          <div className="nav-links">
            <a href="#paths" onClick={(e) => { e.preventDefault(); scrollTo('paths') }}>How it works</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo('pricing') }}>Pricing</a>
            <Link to="/docs">Docs</Link>
            <Link to="/gallery">Gallery</Link>
            <a href="https://shelpin.forestinfra.com" target="_blank" rel="noopener noreferrer">ShelPin</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest Infra</a>
            <Link to="/app" className="nav-cta">Launch App</Link>
          </div>
          <button className="nav-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span className={`burger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`burger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`burger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
        {menuOpen && (
          <div className="nav-mobile-menu">
            <a href="#paths" onClick={(e) => { e.preventDefault(); scrollTo('paths') }}>How it works</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>Features</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo('pricing') }}>Pricing</a>
            <Link to="/docs" onClick={closeMenu}>Docs</Link>
            <Link to="/gallery" onClick={closeMenu}>Gallery</Link>
            <a href="https://shelpin.forestinfra.com" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>ShelPin</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>Forest Infra</a>
            <Link to="/app" className="nav-mobile-cta" onClick={closeMenu}>Launch App</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Build a website.<br />Deploy it <em>forever</em>.
        </h1>
        <p className="hero-sub">
          Chat with our AI to make one, or upload an existing site.<br />
          Either way it ships to decentralised hosting in seconds.
        </p>
        <div className="hero-actions">
          <Link to="/build" className="btn-primary">Build with AI</Link>
          <Link to="/upload" className="btn-primary btn-primary-alt">Upload a site</Link>
        </div>
        <div className="hero-badges">
          <span className="badge">Powered by Shelby</span>
          <span className="badge">Permanent storage</span>
          <span className="badge">Decentralised</span>
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

      {/* Two Paths */}
      <section className="section" id="paths">
        <h2 className="section-title">Two paths to live</h2>
        <p className="section-sub">Start from a blank page or a built one. Both end on Shelby.</p>
        <div className="paths-grid">
          <div className="path-card">
            <span className="path-eyebrow">&gt; BUILD WITH AI</span>
            <ol className="path-steps">
              <li>
                <span className="path-num">1.</span>
                <div>
                  <h4>Describe what you want.</h4>
                  <p>"A portfolio site for a folk musician with a bio and tour dates."</p>
                </div>
              </li>
              <li>
                <span className="path-num">2.</span>
                <div>
                  <h4>Chat until it's right.</h4>
                  <p>"Make the hero darker. Add a testimonials section. Swap the headline."</p>
                </div>
              </li>
              <li>
                <span className="path-num">3.</span>
                <div>
                  <h4>Deploy in one click.</h4>
                  <p>Your subdomain, your share-link, your site.</p>
                </div>
              </li>
            </ol>
            <Link to="/build" className="btn-primary">Start building</Link>
          </div>
          <div className="path-card">
            <span className="path-eyebrow">&gt; UPLOAD YOUR SITE</span>
            <ol className="path-steps">
              <li>
                <span className="path-num">1.</span>
                <div>
                  <h4>ZIP your build folder.</h4>
                  <p>Or paste a GitHub URL. Vite, Next, plain HTML — all welcome.</p>
                </div>
              </li>
              <li>
                <span className="path-num">2.</span>
                <div>
                  <h4>We pin it to Shelby.</h4>
                  <p>Every file lands on permanent decentralised storage.</p>
                </div>
              </li>
              <li>
                <span className="path-num">3.</span>
                <div>
                  <h4>Live in seconds.</h4>
                  <p>Your subdomain, your share-link, your site.</p>
                </div>
              </li>
            </ol>
            <Link to="/upload" className="btn-primary btn-primary-alt">Upload a site</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <h2 className="section-title">Why ShelKit?</h2>
        <p className="section-sub">Everything you need. Nothing you don't.</p>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Chat to iterate</h3>
            <p>Describe your site, then refine it by sending messages. No design tools to learn, no code to write.</p>
          </div>
          <div className="feature-card">
            <h3>Decentralised hosting</h3>
            <p>Powered by Shelby. Your files live on a distributed storage network, not someone else's server.</p>
          </div>
          <div className="feature-card">
            <h3>Permanent URLs</h3>
            <p>Content-addressed storage means your site never goes down, never gets lost, never expires.</p>
          </div>
          <div className="feature-card">
            <h3>From idea to live in minutes</h3>
            <p>The AI builder takes about a minute to generate. Deploy adds another five seconds. That's it.</p>
          </div>
          <div className="feature-card">
            <h3>Bring your own domain</h3>
            <p>Point any domain you own to a ShelKit deployment. Add a CNAME and you're done — SSL included.</p>
          </div>
          <div className="feature-card">
            <h3>Zero config</h3>
            <p>No YAML files. No build scripts. No environment variables. No DevOps team required.</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="section" id="compare">
        <h2 className="section-title">The old way vs the ShelKit way</h2>
        <p className="section-sub">Whether you're building from scratch or shipping what you've got.</p>

        <div className="compare-pair-label">If you're starting from nothing</div>
        <div className="compare-grid">
          <div className="compare-card compare-old">
            <div className="compare-header">
              <span className="compare-x">✕</span>
              Designer + developer
            </div>
            <div className="compare-steps">
              <code>1. Hire a designer (£3k)</code>
              <code>2. Brief them, wait for mocks</code>
              <code>3. Approval rounds (3 weeks)</code>
              <code>4. Hire a developer (£8k+)</code>
              <code>5. Build it (6 weeks)</code>
              <code>6. Set up hosting</code>
              <code>7. Pray it stays online</code>
            </div>
          </div>
          <div className="compare-card compare-new">
            <div className="compare-header">
              <span className="compare-check">✓</span>
              ShelKit AI builder
            </div>
            <div className="compare-steps">
              <code>1. Describe what you want</code>
              <code>2. Chat until you like it</code>
              <code>3. Deploy</code>
            </div>
          </div>
        </div>

        <div className="compare-pair-label">If you've already built one</div>
        <div className="compare-grid">
          <div className="compare-card compare-old">
            <div className="compare-header">
              <span className="compare-x">✕</span>
              Traditional deploy
            </div>
            <div className="compare-steps">
              <code>1. Set up a cloud account</code>
              <code>2. Configure CLI tools</code>
              <code>3. Write build config</code>
              <code>4. Set up CI/CD</code>
              <code>5. Configure DNS</code>
              <code>6. Set up SSL certs</code>
              <code>7. Write deploy scripts</code>
              <code>8. Debug env vars</code>
              <code>9. Wait for propagation</code>
              <code>10. Pray it works</code>
            </div>
          </div>
          <div className="compare-card compare-new">
            <div className="compare-header">
              <span className="compare-check">✓</span>
              ShelKit upload
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
              <li>AI website builder</li>
              <li>Unlimited deploys</li>
              <li>Server-side builds</li>
              <li>GitHub integration</li>
              <li>Custom subdomains</li>
              <li>Bring your own domain</li>
            </ul>
            <Link to="/build" className="btn-primary">Start building</Link>
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
        <h2>Ready to ship?</h2>
        <p>Whether you're starting from a blank page or a built one, we've got you.</p>
        <div className="cta-actions">
          <Link to="/build" className="btn-primary btn-lg">Build with AI</Link>
          <Link to="/upload" className="btn-primary btn-primary-alt btn-lg">Upload a site</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span>Shel<span className="accent">Kit</span></span>
          </div>
          <div className="footer-links">
            <Link to="/build">Build with AI</Link>
            <Link to="/upload">Upload a site</Link>
            <a href="#features">Features</a>
            <Link to="/docs">Docs</Link>
          </div>
          <div className="footer-links">
            <a href="https://shelpin.forestinfra.com" target="_blank" rel="noopener noreferrer">ShelPin</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest Infra</a>
            <a href="https://foreststaking.com" target="_blank" rel="noopener noreferrer">Forest Staking</a>
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer">Shelby</a>
          </div>
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} ShelKit &mdash; a <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest Infra</a> product. Powered by <a href="https://shelpin.forestinfra.com" target="_blank" rel="noopener noreferrer">ShelPin</a>.
          </div>
        </div>
      </footer>
    </div>
  )
}
