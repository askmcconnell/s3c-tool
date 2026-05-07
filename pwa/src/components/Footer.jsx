import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '20px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      fontSize: '0.78rem',
      color: 'var(--text-muted)',
    }}>
      <span>© {year} Ask McConnell's S3C-Tool · Free &amp; open-source</span>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy</Link>
        <Link to="/terms"   style={{ color: 'var(--text-muted)' }}>Terms</Link>
        <Link to="/about"   style={{ color: 'var(--text-muted)' }}>About</Link>
        <Link to="/docs"    style={{ color: 'var(--text-muted)' }}>Docs</Link>
        <Link to="/support" style={{ color: 'var(--accent)' }}>Support ♥</Link>
        <a href="https://github.com/askmcconnell/s3c-tool" target="_blank" rel="noreferrer"
           style={{ color: 'var(--text-muted)' }}>GitHub</a>
      </div>
    </footer>
  )
}
