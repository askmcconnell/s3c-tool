import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api/wordpress'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(part, total) {
  if (!total) return 0
  return Math.round(part / total * 100)
}

function fmt(n) {
  return (n ?? 0).toLocaleString()
}

// ── CSS-only donut chart ──────────────────────────────────────────────────────

function DonutChart({ segments, size = 180, hole = 0.58 }) {
  // segments: [{ value, color, label }]
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let cumulative = 0
  const stops = segments.map(seg => {
    const start = cumulative / total * 100
    cumulative += seg.value
    const end = cumulative / total * 100
    return `${seg.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
  })
  const holeR = Math.round(size * hole / 2)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `conic-gradient(${stops.join(', ')})`,
        WebkitMask: `radial-gradient(circle, transparent ${holeR}px, black ${holeR + 1}px)`,
        mask:       `radial-gradient(circle, transparent ${holeR}px, black ${holeR + 1}px)`,
      }} />
      {/* centre label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>
          {pct(segments.find(s => s.key === 'eol')?.value ?? 0, total)}%
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>EOL</div>
      </div>
    </div>
  )
}

// ── Horizontal bar row ────────────────────────────────────────────────────────

function HBar({ label, sub, value, maxValue, color, right }) {
  const w = maxValue > 0 ? Math.max(2, Math.round(value / maxValue * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div style={{ width: 170, flexShrink: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ width: 52, textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color, flexShrink: 0 }}>
        {right}
      </div>
    </div>
  )
}

// ── Sparkline (scan activity) ─────────────────────────────────────────────────

function Sparkline({ activity }) {
  if (!activity?.length) return <div className="text-muted" style={{ fontSize: '0.85rem' }}>No data yet</div>

  // Fill last 30 days so gaps show as zero
  const days = []
  const now  = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const byDay = Object.fromEntries(activity.map(r => [r.day, r.scans]))
  const values = days.map(d => byDay[d] ?? 0)
  const maxVal = Math.max(...values, 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
      {values.map((v, i) => (
        <div key={i} title={`${days[i]}: ${v} scan${v !== 1 ? 's' : ''}`}
          style={{
            flex: 1, borderRadius: '2px 2px 0 0',
            background: v > 0 ? 'var(--accent)' : 'var(--bg-input)',
            height: v > 0 ? `${Math.max(10, Math.round(v / maxVal * 100))}%` : '6%',
            opacity: v > 0 ? 0.8 : 0.4,
            transition: 'height 0.4s ease',
            cursor: 'default',
          }}
        />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,      setData]      = useState(null)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = (opts = {}) => {
    setError('')
    getDashboard(opts)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load() }, [])

  const handleRefresh = () => {
    const secret = prompt('Enter queue secret to force-refresh dashboard cache:')
    if (!secret) return
    setRefreshing(true)
    load({ refresh: true, secret })
  }

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span className="text-muted">Loading dashboard…</span>
    </div>
  )

  if (error) return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="alert alert-error">{error}</div>
    </div>
  )

  const { summary = {}, top_eol = [], top_software = [], platforms = [], scan_activity = [], reference = {} } = data ?? {}

  const totalAnalyzed  = summary.total_items    || 0
  const maxSoftware    = top_software[0]?.instances ?? 1
  const donutSegments = [
    { key: 'eol',       value: summary.eol      ?? 0, color: 'var(--eol)',       label: 'EOL'       },
    { key: 'no_patch',  value: summary.no_patch  ?? 0, color: 'var(--no-patch)',  label: 'No Patch'  },
    { key: 'outdated',  value: summary.outdated  ?? 0, color: 'var(--outdated)',  label: 'Outdated'  },
    { key: 'unknown',   value: summary.unknown   ?? 0, color: 'var(--unknown)',   label: 'Unknown'   },
    { key: 'lts',       value: summary.lts       ?? 0, color: 'var(--lts)',       label: 'LTS'       },
    { key: 'supported', value: summary.supported ?? 0, color: 'var(--supported)', label: 'Supported' },
  ]
  const maxEol = top_eol[0]?.machines ?? 1

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Hero */}
      <div className="mb-32" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span className="badge">PUBLIC</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Anonymised · updated hourly
          </span>
          {data?.cached !== false && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '2px 10px',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {refreshing ? 'Refreshing…' : 'Force refresh'}
            </button>
          )}
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 10, lineHeight: 1.2 }}>
          The EOL &amp; Unpatched Software Landscape
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 580, lineHeight: 1.6 }}>
          Aggregate end-of-life and unpatched software trends from inventories submitted to S3C-Tool.
          No identifying information — organisations, hostnames, and users are never shown.
        </p>
      </div>

      {/* ── Risk headline banner ────────────────────────────────────────────── */}
      {totalAnalyzed > 0 && (() => {
        // Prefer the server-computed deduplicated count (EOL ∪ no_patch ∪ CVE).
        // Fall back to eol+no_patch if the field isn't in the cache yet.
        const atRisk  = summary.at_risk_deduped ?? ((summary.eol ?? 0) + (summary.no_patch ?? 0))
        const riskPct = Math.round(atRisk / totalAnalyzed * 100)
        const ratio   = atRisk > 0 ? Math.round(totalAnalyzed / atRisk) : null
        const hasCve  = summary.at_risk_deduped != null  // true once cache refreshes with new field

        return (
          <div style={{
            marginBottom: 32,
            padding: '24px 28px',
            borderRadius: 'var(--radius)',
            background: 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(234,88,12,0.06) 100%)',
            border: '1px solid rgba(220,38,38,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative background number */}
            <div style={{
              position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
              fontSize: '8rem', fontWeight: 900, color: 'rgba(220,38,38,0.06)',
              lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
            }}>{riskPct}%</div>

            <div style={{ position: 'relative' }}>
              {/* Big number */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--eol)', lineHeight: 1 }}>
                  {riskPct}%
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
                  of software needs security attention
                </span>
              </div>

              {/* Expanded explanation */}
              <p style={{ margin: '0 0 14px', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 620 }}>
                Of <strong style={{ color: 'var(--text)' }}>{fmt(totalAnalyzed)}</strong> software
                instances analyzed across{' '}
                <strong style={{ color: 'var(--text)' }}>{fmt(summary.total_scans)}</strong> scans,{' '}
                <strong style={{ color: 'var(--eol)' }}>{fmt(atRisk)}</strong> are end-of-life,
                have gone 12+ months without a security patch, or carry known CVEs
                {hasCve ? ' — counted once even when multiple conditions apply' : ''}.
                {ratio && ratio >= 2 && (
                  <> That's <strong style={{ color: 'var(--no-patch)' }}>1 in {ratio}</strong> pieces of software.</>
                )}
              </p>

              {/* Breakdown pills */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px',
                  borderRadius: 20, background: 'rgba(220,38,38,0.12)',
                  border: '1px solid rgba(220,38,38,0.3)', color: 'var(--eol)',
                }}>
                  🔴 {fmt(summary.eol ?? 0)} End of Life
                </span>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px',
                  borderRadius: 20, background: 'rgba(234,88,12,0.10)',
                  border: '1px solid rgba(234,88,12,0.3)', color: 'var(--no-patch)',
                }}>
                  🟡 {fmt(summary.no_patch ?? 0)} No Patch in 12+ Months
                </span>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px',
                  borderRadius: 20, background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626',
                }}>
                  🛡️ Known CVEs (deduplicated)
                </span>
                <span style={{
                  fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}>
                  Real environments · anonymised data
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Top-line numbers */}
      <div className="stats-grid mb-32">
        {[
          { num: fmt(summary.total_scans),       label: 'Scans completed',           color: 'var(--accent)',     title: 'Number of inventory files processed' },
          { num: fmt(totalAnalyzed),              label: 'Total software instances',  color: 'var(--text)',       title: 'All software rows across every scan, including duplicates across machines' },
          { num: fmt(summary.unique_products),    label: 'Unique software products',  color: 'var(--accent)',     title: 'Distinct software names seen across all scans' },
          { num: fmt(summary.eol),                label: 'EOL instances found',       color: 'var(--eol)',        title: 'Software instances confirmed end-of-life' },
          { num: fmt(summary.no_patch ?? 0),      label: 'No-patch instances',        color: 'var(--no-patch)',   title: 'Software with no security patch in 12+ months, no formal EOL announced' },
          { num: `${summary.eol_pct ?? 0}%`,     label: 'EOL / No-Patch rate',       color: 'var(--eol)',        title: 'EOL + no-patch + outdated items ÷ all scanned instances. "EOL" = formal end-of-life date passed. "No-patch" = no security updates in 12+ months, no formal EOL announced. "Outdated" = significantly behind latest release. Matches the per-platform formula below.' },
          { num: fmt(reference.total),            label: 'Products researched',       color: 'var(--text-muted)', title: 'Software products in the S3C-Tool reference database' },
        ].map(({ num, label, color, title }) => (
          <div className="stat-card" key={label} title={title} style={{ cursor: 'default' }}>
            <div className="stat-num" style={{ color }}>{num}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Donut + Top EOL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, marginBottom: 24 }}>

        {/* Status breakdown */}
        <div className="card">
          <div className="card-title">Status breakdown</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <DonutChart segments={donutSegments} />
            <div style={{ flex: 1, minWidth: 120 }}>
              {donutSegments.map(seg => (
                <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '0.8rem' }}>{seg.label}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: seg.color }}>
                    {pct(seg.value, totalAnalyzed)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top EOL software */}
        <div className="card">
          <div className="card-title">Most common EOL &amp; unpatched software</div>
          {top_eol.length === 0 ? (
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>No EOL data yet.</div>
          ) : (
            top_eol.slice(0, 10).map(row => (
              <HBar
                key={row.software_name + row.vendor}
                label={row.software_name}
                sub={row.vendor || undefined}
                value={row.machines}
                maxValue={maxEol}
                color="var(--eol)"
                right={`${fmt(row.machines)} machine${row.machines !== 1 ? 's' : ''}${row.occurrences > row.machines ? ` · ${fmt(row.occurrences)} instances` : ''}`}
              />
            ))
          )}
        </div>

      </div>

      {/* Row 2: Platform + Scan activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* Platform EOL% */}
        <div className="card">
          <div className="card-title">EOL / No-Patch rate by platform</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            EOL + no-patch + outdated items ÷ all items on that platform
          </div>
          {platforms.length === 0 ? (
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>No platform data yet.</div>
          ) : (
            platforms.map(p => (
              <HBar
                key={p.platform}
                label={p.platform}
                sub={`${fmt(p.total)} items`}
                value={p.eol_pct}
                maxValue={100}
                color={p.eol_pct >= 30 ? 'var(--eol)' : p.eol_pct >= 10 ? 'var(--no-patch)' : 'var(--supported)'}
                right={`${p.eol_pct}%`}
              />
            ))
          )}
        </div>

        {/* Scan activity */}
        <div className="card">
          <div className="card-title">
            Scan activity
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.8rem' }}>
              last 30 days
            </span>
          </div>
          <Sparkline activity={scan_activity} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>30 days ago</span>
            <span>Today</span>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total scans in period:{' '}
            <strong style={{ color: 'var(--text)' }}>
              {fmt(scan_activity.reduce((s, r) => s + r.scans, 0))}
            </strong>
          </div>
        </div>

      </div>

      {/* Row 3: Most common software (all statuses) */}
      {top_software.length > 0 && (
        <div className="card mb-24">
          <div className="card-title">
            Most common software
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.8rem' }}>
              unique products by frequency across all scans
            </span>
          </div>
          {top_software.map(row => {
            const isEol     = row.eol_status === 'eol'
            const isNoPatch = row.eol_status === 'no_patch'
            const barColor  = isEol ? 'var(--eol)' : isNoPatch ? 'var(--no-patch)' : 'var(--accent)'
            return (
              <HBar
                key={row.software_name}
                label={row.software_name}
                sub={row.version_count > 1 ? `${row.version_count} versions seen` : undefined}
                value={row.instances}
                maxValue={maxSoftware}
                color={barColor}
                right={fmt(row.instances)}
              />
            )
          })}
          <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Bar colour: <span style={{ color: 'var(--eol)' }}>■ EOL</span>
            {' · '}<span style={{ color: 'var(--no-patch)' }}>■ No Patch</span>
            {' · '}<span style={{ color: 'var(--accent)' }}>■ Supported/Other</span>
            {' · '} Count = total instances (same product on multiple machines counted separately)
          </div>
        </div>
      )}

      {/* EOL details table (full top 20) */}
      {top_eol.length > 10 && (
        <div className="card mb-24">
          <div className="card-title">EOL &amp; Unpatched Software — Full List — Sorted Oldest First</div>
          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Software</th>
                  <th>Vendor</th>
                  <th style={{ textAlign: 'right' }}>EOL date</th>
                  <th>Latest</th>
                  <th style={{ textAlign: 'right' }}>Machines</th>
                  <th style={{ textAlign: 'right' }}>Instances</th>
                </tr>
              </thead>
              <tbody>
                {[...top_eol].sort((a, b) => {
                  if (!a.eol_date) return 1
                  if (!b.eol_date) return -1
                  return a.eol_date.localeCompare(b.eol_date)
                }).map((row, i) => (
                  <tr key={row.software_name + row.vendor}>
                    <td className="muted" style={{ fontSize: '0.8rem', width: 32 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{row.software_name}</td>
                    <td className="muted">{row.vendor || '—'}</td>
                    <td className="mono muted" style={{ textAlign: 'right' }}>{row.eol_date || '—'}</td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>{row.latest_version || '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--eol)', fontWeight: 600 }}>
                      {fmt(row.machines)}
                    </td>
                    <td className="mono muted" style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                      {fmt(row.occurrences)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reference database / Pi research status */}
      <div className="card mb-24">
        <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>Research database</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Continuously updated by a nightly research agent
              {reference.last_sync && ` · last sync ${new Date(reference.last_sync + 'Z').toLocaleDateString()}`}
            </div>
          </div>
          {reference.coverage_pct != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: reference.coverage_pct >= 80 ? 'var(--supported)' : 'var(--accent)' }}>
                {reference.coverage_pct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>scan coverage</div>
            </div>
          )}
        </div>

        {/* Coverage bar */}
        {reference.coverage_pct != null && (
          <div className="mb-16">
            <div className="progress-bar">
              <div className="progress-fill" style={{
                width: `${reference.coverage_pct}%`,
                background: reference.coverage_pct >= 80 ? 'var(--supported)' : undefined,
              }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {fmt(reference.total)} products researched of {fmt(summary.unique_products)} unique products seen across all scans
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          {[
            { label: 'Products researched', value: fmt(reference.total),         color: 'var(--text)'      },
            { label: 'EOL in database',     value: fmt(reference.eol_entries),   color: 'var(--eol)'       },
            { label: 'Updated (24 h)',      value: fmt(reference.updated_24h),   color: 'var(--supported)' },
            { label: 'Updated (7 days)',    value: fmt(reference.updated_7d),    color: 'var(--supported)' },
            { label: 'Expiring soon',       value: fmt(reference.expiring_soon), color: reference.expiring_soon > 0 ? 'var(--warning)' : 'var(--text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value ?? '—'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* NVD enrichment sub-section */}
        {reference.nvd_checked != null && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                NVD / CVE Enrichment
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Note: As of April 2026, NIST NVD only enriches high-priority CVEs — coverage may be incomplete for lower-risk entries.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              {(() => {
                // "Unknown" rows have no identifiable software info — the NVD enricher
                // intentionally skips them. True coverage = checked / (total − unknown).
                const eligible     = (reference.total ?? 0) - (reference.nvd_ineligible ?? 0)
                const coveragePct  = eligible > 0 ? Math.round((reference.nvd_checked ?? 0) / eligible * 100) : 0
                const nvdChecked   = reference.nvd_checked ?? 0
                const withCves     = reference.nvd_with_cves ?? 0
                const kevFlagged   = reference.kev_flagged ?? 0
                const cvePct       = nvdChecked > 0 ? Math.round(withCves / nvdChecked * 100) : 0
                return [
                  { label: 'NVD checked',         value: fmt(reference.nvd_checked),    color: 'var(--accent)'    },
                  { label: 'With CVEs',            value: fmt(reference.nvd_with_cves),  color: 'var(--eol)',       title: `${cvePct}% of checked versions carry at least one known CVE` },
                  { label: 'CVE prevalence',       value: `${cvePct}%`,                  color: 'var(--no-patch)',  title: 'Share of NVD-checked reference versions that carry at least one known CVE' },
                  { label: '🚨 KEV flagged',        value: fmt(kevFlagged),               color: '#7c3aed',          title: 'Reference versions with at least one CVE actively exploited in the wild (CISA KEV catalog)' },
                  { label: 'Unresolvable entries', value: fmt(reference.nvd_ineligible), color: 'var(--text-muted)', title: 'Software the research agent could not identify — NVD lookup not possible' },
                  { label: 'NVD coverage',         value: `${coveragePct}%`,             color: coveragePct >= 100 ? 'var(--supported)' : 'var(--accent)', title: 'Of identifiable (non-unknown) reference entries' },
                ]
              })().map(({ label, value, color, title }) => (
                <div key={label} title={title} style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '10px 12px', cursor: title ? 'help' : 'default' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color }}>{value ?? '—'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="card" style={{ textAlign: 'center', background: 'var(--bg-input)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
          Is your software stack up to date?
        </div>
        <p className="text-muted mb-16" style={{ fontSize: '0.9rem' }}>
          Upload an S3C-Tool CSV or SBOM file to get a personalised EOL &amp; unpatched software report for your environment.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary">Get started free</Link>
          <Link to="/docs" className="btn btn-ghost">Learn more</Link>
        </div>
      </div>

    </div>
  )
}
