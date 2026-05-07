import { useState, useEffect, useCallback } from 'react'
import { getReference, searchReference, getStats } from '../api/wordpress'
import StatusBadge from '../components/StatusBadge'

const STATUS_FILTERS = ['', 'eol', 'supported', 'lts', 'no_patch', 'unknown']

const SOURCE_LABELS = {
  'endoflife.date': 'endoflife.date API',
  'github-yaml':    'GitHub software-status.json',
  'github':         'GitHub activity',
  'repology':       'Repology',
  'claude':         'Claude AI research',
  'openai':         'OpenAI research',
  'gemini':         'Gemini research',
  'xai':            'xAI research',
  'consensus':      'Multi-model consensus',
  'pypi':           'PyPI registry',
  'npm':            'npm registry',
  'rubygems':       'RubyGems registry',
  'manual':         'Manually verified',
}

function sourceLabel(src) {
  return SOURCE_LABELS[src] || src || 'Unknown source'
}

export default function ReferencePage() {
  const [data,    setData]    = useState(null)
  const [stats,   setStats]   = useState(null)
  const [query,   setQuery]   = useState('')
  const [status,  setStatus]  = useState('')
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Load aggregate stats once on mount
  useEffect(() => {
    getStats().then(setStats).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = query.length >= 2
        ? await searchReference(query)
        : await getReference({ page, perPage: 100, status })
      setData(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [query, status, page])

  useEffect(() => {
    const t = setTimeout(load, query ? 400 : 0)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => { setPage(1) }, [status, query])

  const items = data?.items ?? []
  const total = data?.total ?? data?.count ?? 0
  const pages = data?.pages ?? 1

  const statChips = stats ? [
    { label: 'Supported', value: stats.supported_entries, color: 'var(--supported)',  filter: 'supported' },
    { label: 'LTS',       value: stats.lts_entries,       color: 'var(--lts)',        filter: 'lts'       },
    { label: 'No-patch',  value: stats.no_patch_entries,  color: 'var(--no-patch)',   filter: 'no_patch'  },
    { label: 'EOL',       value: stats.eol_entries,       color: 'var(--eol)',        filter: 'eol'       },
    { label: 'Unknown',   value: stats.unknown_entries,   color: 'var(--text-muted)', filter: 'unknown'   },
  ] : []

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Reference Database</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {stats ? stats.reference_entries.toLocaleString() : '—'} entries · updated nightly by the S3C research agent
          </p>
        </div>
      </div>

      {/* Aggregate stat chips — clickable to filter */}
      {statChips.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {statChips.map(chip => (
            <button
              key={chip.filter}
              onClick={() => setStatus(status === chip.filter ? '' : chip.filter)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                border: `1px solid ${status === chip.filter ? chip.color : 'var(--border)'}`,
                background: status === chip.filter ? chip.color + '18' : 'var(--bg-card)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                color: status === chip.filter ? chip.color : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: chip.color, flexShrink: 0 }} />
              {chip.label}
              <span style={{ fontWeight: 700, color: status === chip.filter ? chip.color : 'var(--text)' }}>
                {(chip.value ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
          {status && (
            <button
              onClick={() => setStatus('')}
              style={{
                padding: '5px 12px', borderRadius: 20,
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)',
              }}
            >
              ✕ Clear filter
            </button>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="card mb-16">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
          <input
            className="input"
            type="search"
            placeholder="Search software name or vendor…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            className="input"
            style={{ width: 'auto' }}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_FILTERS.slice(1).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span className="text-muted">Loading…</span></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No results</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <>
          {/* Results count when filtered */}
          {(query || status) && (
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
              {total.toLocaleString()} {status ? status.replace('_', '-') : ''} result{total !== 1 ? 's' : ''}
              {query ? ` matching "${query}"` : ''}
            </p>
          )}

          <div className="table-wrap">
            <table style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Software</th>
                  <th style={{ minWidth: 130 }}>Vendor</th>
                  <th style={{ minWidth: 90  }}>Platform</th>
                  <th style={{ minWidth: 110 }}>Status</th>
                  <th style={{ minWidth: 90  }}>EOL date</th>
                  <th style={{ minWidth: 100 }}>Latest</th>
                  <th style={{ minWidth: 110 }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => {
                  const src = row.ref_source || ''
                  const tooltipText = `Source: ${sourceLabel(src)}\nConfidence: ${row.confidence ?? 0}%${row.ref_notes ? '\n' + row.ref_notes : ''}`
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.software_name}</td>
                      <td className="muted">{row.vendor || '—'}</td>
                      <td className="muted">{row.platform || '—'}</td>
                      <td><StatusBadge status={row.eol_status} /></td>
                      <td className="mono muted">{row.eol_date || '—'}</td>
                      <td className="mono">
                        {row.latest_version
                          ? row.latest_source_url
                            ? <a href={row.latest_source_url} target="_blank" rel="noreferrer">{row.latest_version}</a>
                            : row.latest_version
                          : '—'}
                      </td>
                      <td>
                        <div
                          title={tooltipText}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'help' }}
                        >
                          <div style={{
                            width: 40, height: 4, background: 'var(--bg-input)',
                            borderRadius: 2, overflow: 'hidden', flexShrink: 0,
                          }}>
                            <div style={{
                              width: `${row.confidence ?? 0}%`,
                              height: '100%',
                              background: row.confidence >= 80 ? 'var(--supported)' :
                                          row.confidence >= 50 ? 'var(--warning)' : 'var(--eol)',
                              borderRadius: 2,
                            }} />
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {row.confidence ?? 0}%
                          </span>
                          {src && (
                            <span style={{
                              fontSize: '0.65rem', color: 'var(--text-muted)',
                              background: 'var(--bg-input)', borderRadius: 3,
                              padding: '1px 5px', maxWidth: 80,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {src}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && !query && (
            <div className="flex-center mt-16" style={{ gap: 8, justifyContent: 'center' }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >← Prev</button>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                Page {page} of {pages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
