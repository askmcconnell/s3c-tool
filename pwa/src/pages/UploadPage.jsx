import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { uploadInventory, getStats } from '../api/wordpress'

export default function UploadPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const fileRef  = useRef()
  const [dragging,   setDragging]   = useState(false)
  const [file,       setFile]       = useState(null)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [stats,      setStats]      = useState(null)
  const [confirmed,  setConfirmed]  = useState(null) // { uuid, filename, rowCount, email }

  useEffect(() => {
    getStats().then(setStats).catch(() => {})
  }, [])

  function handleFile(f) {
    if (!f) return
    const isCsv  = f.name.endsWith('.csv')
    const isJson = f.name.endsWith('.json')
    if (!isCsv && !isJson) { setError('Accepted formats: S3C-Tool CSV (.csv), CycloneDX JSON (.json), SPDX JSON (.json)'); return }
    if (f.size > 2 * 1024 * 1024) { setError('File exceeds 2 MB limit.'); return }
    setError('')
    setFile(f)
  }

  function fileFormatLabel(f) {
    if (!f) return ''
    if (f.name.endsWith('.json')) return 'SBOM (JSON)'
    return 'S3C-Tool CSV'
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleUpload() {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const res = await uploadInventory(file)
      setConfirmed({
        uuid:     res.uuid,
        filename: file.name,
        rowCount: res.row_count,
        email:    user?.email ?? '',
      })
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div style={{ maxWidth: 560, margin: '64px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Got your file!</h1>
        <p className="text-muted mb-24" style={{ fontSize: '0.95rem' }}>
          We're processing <strong>{confirmed.filename}</strong> ({confirmed.rowCount?.toLocaleString()} items)
          against the reference database.
        </p>

        <div className="card mb-24" style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📧</div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>We'll email you when it's ready</div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                A link to your report will be sent to <strong>{confirmed.email}</strong>.
                The link is valid for 24 hours. Large files may take up to 30 minutes to process.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={`/results/${confirmed.uuid}`} className="btn btn-ghost">
            Watch live
          </Link>
          <button className="btn btn-primary" onClick={() => { setConfirmed(null); setFile(null) }}>
            Upload another file
          </button>
        </div>

        <p className="text-muted mt-24" style={{ fontSize: '0.8rem' }}>
          You can also access all past reports from your account at any time.
        </p>
      </div>
    )
  }

  // ── Upload form ───────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* ── Welcome hero ── */}
      <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
        <img
          src="/s3c/icon.svg"
          alt="S3C-Tool"
          width="72"
          height="72"
          style={{ marginBottom: 16, filter: 'drop-shadow(0 0 12px rgba(74,144,217,0.35))' }}
        />
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em' }}>
          Know Your Software. Secure Your Supply Chain.
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto 20px' }}>
          Upload a software inventory and instantly see what's end-of-life, unpatched, or carrying
          known CVEs — powered by a continuously updated shared reference database.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: '🔴 EOL Detection',     color: 'var(--eol)' },
            { label: '⚠️ No-Patch Alerts',   color: 'var(--no-patch)' },
            { label: '🛡️ CVE Enrichment',    color: 'var(--accent)' },
            { label: '🌐 Shared Reference DB', color: 'var(--supported)' },
          ].map(({ label, color }) => (
            <span key={label} style={{
              fontSize: '0.78rem', fontWeight: 500,
              padding: '4px 10px', borderRadius: 20,
              border: `1px solid ${color}`,
              color, background: 'transparent',
              letterSpacing: '0.01em',
            }}>{label}</span>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Free &amp; open-source ·{' '}
          <Link to="/about" style={{ color: 'var(--accent)' }}>About the project</Link>
          {' '}·{' '}
          <Link to="/docs" style={{ color: 'var(--accent)' }}>Docs &amp; scanners</Link>
        </div>
      </div>

      {/* ── Risk headline banner ── */}
      {stats && stats.total_items > 0 && (() => {
        const atRisk  = stats.at_risk_deduped ?? 0
        const total   = stats.total_items
        const riskPct = Math.round(atRisk / total * 100)
        const ratio   = atRisk > 0 ? Math.round(total / atRisk) : null
        return (
          <div style={{
            marginBottom: 28,
            padding: '22px 26px',
            borderRadius: 'var(--radius)',
            background: 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(234,88,12,0.06) 100%)',
            border: '1px solid rgba(220,38,38,0.25)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              fontSize: '7rem', fontWeight: 900, color: 'rgba(220,38,38,0.06)',
              lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
            }}>{riskPct}%</div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, color: 'var(--eol)', lineHeight: 1 }}>
                  {riskPct}%
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                  of software needs security attention
                </span>
              </div>
              <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 560 }}>
                Of <strong style={{ color: 'var(--text)' }}>{atRisk.toLocaleString()}</strong> out of{' '}
                <strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong> software instances
                analyzed across <strong style={{ color: 'var(--text)' }}>{stats.scans_completed?.toLocaleString()}</strong> scans
                are end-of-life, unpatched, or carry known CVEs.
                {ratio && ratio >= 2 && (
                  <> That's <strong style={{ color: 'var(--no-patch)' }}>1 in {ratio}</strong> pieces of software.</>
                )}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '🔴 End of Life',            color: 'rgba(220,38,38,0.3)',  bg: 'rgba(220,38,38,0.08)',  text: 'var(--eol)'      },
                  { label: '🟡 No Patch 12+ Months',    color: 'rgba(234,88,12,0.3)',  bg: 'rgba(234,88,12,0.08)', text: 'var(--no-patch)' },
                  { label: '🛡️ Known CVEs (deduped)',   color: 'rgba(220,38,38,0.2)',  bg: 'rgba(220,38,38,0.06)', text: '#dc2626'         },
                  { label: 'Real environments · anonymised', color: 'var(--border)', bg: 'var(--bg-input)', text: 'var(--text-muted)' },
                ].map(({ label, color, bg, text }) => (
                  <span key={label} style={{
                    fontSize: '0.72rem', fontWeight: 500, padding: '3px 9px',
                    borderRadius: 20, background: bg, border: `1px solid ${color}`, color: text,
                  }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Stats — community resource CTA */}
      {stats && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
              Shared Industry Resource
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Contribute to this ever-growing community knowledge base
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Every scan enriches the shared reference database — making results faster and more accurate for everyone.
            </div>
          </div>
          <div className="stats-grid">
            {[
              { num: stats.reference_entries?.toLocaleString(), label: 'Reference entries', color: 'var(--accent)' },
              { num: stats.eol_entries?.toLocaleString(),       label: 'Known EOL',          color: 'var(--eol)' },
              { num: stats.supported_entries?.toLocaleString(), label: 'Supported',           color: 'var(--supported)' },
              { num: stats.scans_completed?.toLocaleString(),   label: 'Scans completed',     color: 'var(--text-muted)' },
            ].map(({ num, label, color }) => (
              <div className="stat-card" key={label}>
                <div className="stat-num" style={{ color }}>{num ?? '—'}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 24 }} />

      {/* Step 1 — Download & Run Scanner */}
      <div className="card mb-16">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(74,144,217,0.15)', border: '1px solid rgba(74,144,217,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)',
          }}>1</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Download &amp; Run the Scanner</div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 14 }}>
          Run the free S3C-Tool scanner on your machine. It takes 1–3 minutes, requires no admin
          rights, and saves a CSV file locally — nothing is sent until you choose to upload.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            { icon: '🍎', label: 'macOS',   cmd: 'python3 s3c_scan_mac.py',   url: '/s3c/scanners/s3c_scan_mac.py' },
            { icon: '🐧', label: 'Linux',   cmd: 'python3 s3c_scan_linux.py', url: '/s3c/scanners/s3c_scan_linux.py' },
          ].map(({ icon, label, cmd, url }) => (
            <a key={label} href={url} download
               style={{
                 display: 'flex', flexDirection: 'column', gap: 6,
                 padding: '12px 14px', borderRadius: 8,
                 background: 'var(--bg-input)', border: '1px solid var(--border)',
                 textDecoration: 'none', color: 'inherit',
               }}>
              <div style={{ fontSize: '1.1rem' }}>{icon} <strong style={{ fontSize: '0.875rem' }}>{label}</strong></div>
              <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{cmd}</code>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>Download scanner ↓</span>
            </a>
          ))}

          {/* Windows — requires two files in the same folder */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--bg-input)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '1.1rem' }}>🪟 <strong style={{ fontSize: '0.875rem' }}>Windows</strong></div>
            <code style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Double-click Run_S3C_Scanner.bat</code>
            <a href="/s3c/scanners/Run_S3C_Scanner.bat" download
               style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Download launcher (.bat) ↓
            </a>
            <a href="/s3c/scanners/s3c_scan_windows.ps1" download
               style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              Also download scanner (.ps1) ↓
            </a>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Save both files to the same folder, then double-click the .bat
            </span>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Need help? See the <Link to="/docs" style={{ color: 'var(--accent)' }}>full Docs &amp; scanner guide</Link> for step-by-step instructions, prerequisites, and examples.
        </div>
      </div>

      {/* Step 2 header */}
      <div className="mb-16">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>Step 2: Upload Your Inventory</h2>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          Upload the CSV generated by the scanner — or drop a CycloneDX / SPDX SBOM if you already have one.
        </p>
      </div>

      {/* Upload card */}
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Drop zone */}
        <div
          className={`drop-zone${dragging ? ' drag-over' : ''}`}
          onClick={() => !file && fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <div className="drop-zone-icon">{file.name.endsWith('.json') ? '🔍' : '📄'}</div>
              <div className="drop-zone-title">{file.name}</div>
              <div className="drop-zone-sub">
                {fileFormatLabel(file)} · {(file.size / 1024).toFixed(1)} KB — click to change
              </div>
            </>
          ) : (
            <>
              <div className="drop-zone-icon">⬆️</div>
              <div className="drop-zone-title">Step 2: Drop your inventory file here</div>
              <div className="drop-zone-sub">S3C-Tool CSV · CycloneDX JSON · SPDX JSON — max 5,000 rows / 2 MB</div>
            </>
          )}
        </div>

        {/* Upload button — or sign-in prompt for guests */}
        {file && (
          user ? (
            <button
              className="btn btn-primary btn-full btn-lg mt-16"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" style={{width:16,height:16}} /> Uploading…</>
                : `Analyze ${file.name}`
              }
            </button>
          ) : (
            <div className="mt-16" style={{ textAlign: 'center' }}>
              <p className="text-muted mb-12" style={{ fontSize: '0.9rem' }}>
                Create a free account (or sign in) to analyze your file — it only takes a moment.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn btn-primary">Create free account</Link>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
              </div>
            </div>
          )
        )}

        {/* Support callout */}
        <div className="mt-16" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          S3C-Tool is free and open-source.{' '}
          <a href="/support" style={{ color: 'var(--accent)' }}>
            Support the project
          </a>{' '}
          if it's useful to you.
        </div>
      </div>

      {/* Instructions */}
      <div className="card mt-24">
        <div className="card-title">Accepted file formats</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.875rem' }}>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📄 S3C-Tool CSV — machine inventory scanner</div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Use the free scanner for macOS, Linux, or Windows (see Step 1 above).
              The scanner runs locally in 1–3 minutes and saves a <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4 }}>.csv</code> file to your desktop.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>🔍 CycloneDX or SPDX JSON — SBOM import</div>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 6px' }}>
              Already generating SBOMs in your CI/CD pipeline? Upload them directly.
              Compatible with Syft, Trivy, cdxgen, Grype, and any tool producing standard CycloneDX 1.x or SPDX 2.x JSON.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
