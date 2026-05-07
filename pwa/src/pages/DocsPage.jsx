export default function DocsPage() {
  const code = (s) => (
    <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: '0.85em' }}>
      {s}
    </code>
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>Documentation</h1>
      <p className="text-muted mb-24">How to generate an inventory file and upload it to S3C-Tool.</p>

      {/* Downloads */}
      <div className="card mb-24">
        <div className="card-title">📦 Download Scanners</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { name: 'macOS Scanner',   file: 's3c_scan_mac.py',   icon: '🍎', cmd: 'python3 s3c_scan_mac.py --quick' },
            { name: 'Linux Scanner',   file: 's3c_scan_linux.py', icon: '🐧', cmd: 'python3 s3c_scan_linux.py --quick' },
          ].map(({ name, file, icon, cmd }) => (
            <div key={file} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {code(file)}
              </div>
              <a href={`https://askmcconnell.com/s3c/scanners/${file}`} className="btn btn-ghost btn-sm" download>
                ⬇ Download
              </a>
            </div>
          ))}

          {/* Windows — two-file package */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🪟</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Windows Scanner</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Requires two files in the same folder:
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.8 }}>
              {code('Run_S3C_Scanner.bat')} — launcher<br />
              {code('s3c_scan_windows.ps1')} — scanner
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="https://askmcconnell.com/s3c/scanners/Run_S3C_Scanner.bat" className="btn btn-ghost btn-sm" download>
                ⬇ Download Launcher (.bat)
              </a>
              <a href="https://askmcconnell.com/s3c/scanners/s3c_scan_windows.ps1" className="btn btn-ghost btn-sm" download>
                ⬇ Download Scanner (.ps1)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick start */}
      <div className="card mb-24">
        <div className="card-title">🚀 Quick Start</div>
        <ol style={{ paddingLeft: 20, lineHeight: 2.2, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <li>Download the scanner for your platform above</li>
          <li>
            <strong>macOS / Linux</strong>: Python 3.8+ required (pre-installed on macOS and most Linux distros)<br />
            <strong>Windows</strong>: Download both {code('Run_S3C_Scanner.bat')} and {code('s3c_scan_windows.ps1')} — save to the same folder
          </li>
          <li>
            <strong>macOS / Linux</strong>: {code('python3 s3c_scan_mac.py --quick')} or {code('python3 s3c_scan_linux.py --quick')}<br />
            <strong>Windows</strong>: Double-click {code('Run_S3C_Scanner.bat')} — a console window opens, runs the scan, then saves your CSV to the Desktop
            <span style={{ display: 'block', fontSize: '0.8rem', marginTop: 4, color: 'var(--text-dim)' }}>
              ⚠ Do not run the .ps1 directly from cmd.exe — Windows execution policy will silently block it. Use the .bat launcher.
            </span>
            <span style={{ display: 'block', fontSize: '0.8rem', marginTop: 2 }}>
              Output: {code('s3c_inventory_[platform]_YYYY-MM-DD.csv')} on your Desktop
            </span>
          </li>
          <li>Log in and upload the CSV on the <a href="/s3c/">Upload page</a></li>
          <li>Your EOL/EOS report is ready in seconds</li>
        </ol>
        <div className="alert alert-info mt-16" style={{ marginBottom: 0 }}>
          The <strong>--quick</strong> flag scans apps and CLI tools only (~30 seconds).
          Full scan (without flag) includes bundled frameworks and libraries (~2–5 minutes).
        </div>
      </div>

      {/* Enterprise / Fleet Deployment */}
      <div className="card mb-24" style={{ borderColor: 'var(--accent)', borderWidth: 1, borderStyle: 'solid' }}>
        <div className="card-title">🏢 Enterprise & Fleet Deployment</div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Deploying across 10–100+ machines via a central management system (SCCM, Intune, Ansible, Puppet, Salt)?
          All three scanners support headless, fully automated operation with a single API token.
        </p>

        {/* How it works */}
        <div style={{ fontWeight: 600, marginBottom: 8 }}>How it works</div>
        <ol style={{ paddingLeft: 20, lineHeight: 2.2, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
          <li>Your management system pushes the scanner + a deployment command to each machine</li>
          <li>Each machine scans itself, auto-uploads the CSV, and logs its Job UUID locally</li>
          <li>All reports appear in your <strong>My Scans</strong> page labeled by machine name</li>
          <li>Sort by EOL count to prioritize which machines need attention first</li>
        </ol>

        {/* Commands */}
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Deployment commands</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            ['🐧 Linux (push via Ansible / Salt / SSH)', 'bash',
             'sudo python3 s3c_scan_linux.py --autoupload --token YOUR_TOKEN --label "PROD-WEB-01"'],
            ['🪟 Windows (push via SCCM / Intune / GPO)', 'powershell',
             '.\\s3c_scan_windows.ps1 -AutoUpload -Token "YOUR_TOKEN" -Label "PROD-WIN-47"'],
            ['🍎 macOS (push via Jamf / Munki)', 'bash',
             'python3 s3c_scan_mac.py --autoupload --token YOUR_TOKEN --label "MAC-EXEC-03"'],
          ].map(([title, , cmd]) => (
            <div key={title}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
              <pre style={{ margin: 0, background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text)', overflowX: 'auto', lineHeight: 1.5 }}>{cmd}</pre>
            </div>
          ))}
        </div>

        {/* Flags reference */}
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Auto-upload flags</div>
        <div className="table-wrap" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr><th>Flag (Linux/Mac)</th><th>Flag (Windows)</th><th>Required</th><th>Description</th></tr>
            </thead>
            <tbody>
              {[
                ['--autoupload', '-AutoUpload', 'Yes', 'Upload CSV automatically after scan completes'],
                ['--token YOUR_TOKEN', '-Token "YOUR_TOKEN"', 'Yes', 'Your S3C-Tool API bearer token'],
                ['--label "MACHINE-01"', '-Label "MACHINE-01"', 'No', 'Human-readable label shown in My Scans. Defaults to hostname.'],
                ['--quick', '-Quick', 'No', 'Faster scan — packages & CLI only, skips deep file scan'],
              ].map(([lm, win, req, desc]) => (
                <tr key={lm}>
                  <td>{code(lm)}</td>
                  <td>{code(win)}</td>
                  <td style={{ textAlign: 'center', color: req === 'Yes' ? 'var(--eol)' : 'var(--text-dim)' }}>{req}</td>
                  <td className="muted" style={{ fontSize: '0.8rem' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pre-deployment checklist */}
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Pre-deployment checklist</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {[
            ['Outbound HTTPS', 'Each machine needs outbound access to askmcconnell.com (port 443). Check firewall and proxy rules.'],
            ['Run as admin', 'Linux/Mac: run with sudo for full package inventory. Windows: run as Administrator.'],
            ['Python 3.8+', 'Required for Linux and Mac scanners. Pre-installed on most modern distros and macOS.'],
            ['One token, all machines', 'A single contributor token covers unlimited uploads. All machines report into one account.'],
            ['Row limit', 'Max 5,000 rows / 2 MB per upload. Servers with extremely large package sets may need --quick mode.'],
            ['Result log', 'Each machine writes its Job UUID to s3c_result.log in the scanner directory — useful for automated collection.'],
            ['Viewing reports', 'Log into My Scans — all machines appear in one table, labeled, sortable by EOL count.'],
          ].map(([label, desc]) => (
            <div key={label} style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: 'var(--supported)', flexShrink: 0 }}>✓</span>
              <span><strong>{label}:</strong> {desc}</span>
            </div>
          ))}
        </div>

        {/* API token callout */}
        <div className="alert alert-info" style={{ marginTop: 20, marginBottom: 0 }}>
          <strong>Where is my API token?</strong> Your bearer token was returned when you registered your account. If you need it resent, contact <a href="mailto:jim@askmcconnell.com">jim@askmcconnell.com</a>. Keep it private — anyone with your token can upload scans to your account.
        </div>
      </div>

      {/* CSV format */}
      <div className="card mb-24">
        <div className="card-title">📋 CSV Format v1.0</div>
        <p className="text-muted mb-16" style={{ fontSize: '0.875rem' }}>
          S3C-Tool expects these 17 columns. The scanners produce this format automatically.
          Only {code('software_name')} is required — all other columns are optional.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Column</th><th>Required</th><th>Example</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {[
                ['s3c_format_version', '—', '1.0',         'Always "1.0"'],
                ['scan_date',           '—', '2026-04-05',  'ISO 8601 date'],
                ['hostname_hash',       '—', 'a3f9b2c1…',  'SHA-256 prefix (privacy)'],
                ['platform',            '—', 'mac',         'mac | linux | windows'],
                ['arch',                '—', 'arm64',       'CPU architecture'],
                ['os_version',          '—', 'macOS 15.3',  'OS version string'],
                ['filename',            '—', 'Slack.app',   'File or bundle name'],
                ['filepath',            '—', '/Applications/Slack.app', 'Full path'],
                ['software_name',       '✓', 'Slack',       'Product name (required)'],
                ['vendor',              '—', 'Slack Technologies', 'Publisher'],
                ['version',             '—', '4.42.0',      'Installed version'],
                ['file_version',        '—', '4.42.0.0',    'Binary file version'],
                ['file_size_bytes',     '—', '284672',      'Integer'],
                ['file_type',           '—', 'app',         'app | binary | library | package | snap | flatpak'],
                ['parent_app',          '—', 'Slack',       'Containing bundle name'],
                ['install_date',        '—', '2026-01-15',  'ISO 8601 date'],
                ['source',              '—', 'plist',       'How version was found'],
              ].map(([col, req, ex, note]) => (
                <tr key={col}>
                  <td>{code(col)}</td>
                  <td style={{ textAlign: 'center', color: req === '✓' ? 'var(--supported)' : 'var(--text-dim)' }}>{req}</td>
                  <td className="mono" style={{ fontSize: '0.8rem' }}>{ex}</td>
                  <td className="muted" style={{ fontSize: '0.8rem' }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status codes */}
      <div className="card mb-24">
        <div className="card-title">🔴 Status Definitions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['eol',       'var(--eol)',       'End of Life',  'Vendor has officially ended support. No more security patches.'],
            ['no_patch',  'var(--no-patch)',  'No Patch',     'No security patches released in 12+ months but no formal EOL announced.'],
            ['unknown',   'var(--unknown)',   'Unknown',      'Not in reference database yet. Will be researched nightly.'],
            ['supported', 'var(--supported)', 'Supported',    'Currently receiving security updates from the vendor.'],
            ['lts',       'var(--lts)',       'LTS',          'Long-term support — extended patch cycle.'],
          ].map(([status, color, label, desc]) => (
            <div key={status} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 600, color }}>{label}</span>
                <span className="text-muted" style={{ fontSize: '0.875rem', marginLeft: 8 }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* For software vendors */}
      <div className="card mb-24" style={{ borderColor: 'var(--accent)', borderWidth: 1, borderStyle: 'solid' }}>
        <div className="card-title">🏭 Are You a Software Vendor or OSS Maintainer?</div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Help your users get accurate lifecycle data — without relying on AI guesses or scraped docs.
          Publish a single JSON file in your GitHub repository and security tools will use it as the
          authoritative source for your software's EOL status.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="https://github.com/askmcconnell/s3c-tool/blob/main/docs/manufacturer-adoption-guide.md"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            📖 Adoption Guide — 5 min read
          </a>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Part of the proposed IETF Well-Known URI standard ·{' '}
            <a
              href="https://datatracker.ietf.org/doc/draft-mcconnell-software-status-wellknown/"
              target="_blank"
              rel="noopener noreferrer"
            >
              draft-mcconnell-software-status-wellknown
            </a>
          </span>
        </div>
        <div style={{ marginTop: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minimal example — add to your repo at <code style={{ textTransform: 'none' }}>.github/software-status.json</code></div>
          <pre style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, overflowX: 'auto' }}>{`{
  "schema_version": "1.0",
  "name": "Your Project",
  "vendor": "Your Org",
  "versions": [
    { "version": "3.0", "status": "active", "support_ends": null },
    { "version": "2.x", "status": "eol",    "eol_date": "2024-06-30" }
  ]
}`}</pre>
        </div>
      </div>

      {/* FAQ */}
      <div className="card">
        <div className="card-title">❓ FAQ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: '0.9rem' }}>
          {[
            ['Is my data private?',
             'Yes. Your hostname is stored as a one-way SHA-256 hash — we never see your actual machine name. File paths and software names are stored only for the duration of your session report.'],
            ['How is the reference database populated?',
             'A Raspberry Pi research agent runs nightly, querying endoflife.date (442+ products), manufacturer lifecycle pages, and Claude AI as a last resort. Results are pushed to IONOS nightly.'],
            ['What if my software shows "Unknown"?',
             '"Unknown" means it isn\'t in the reference DB yet. It\'s queued for research and will resolve within 1–3 nightly cycles. Upload the same file again in a few days to see updated results.'],
            ['Can I upload multiple platforms?',
             'Each upload is one CSV from one platform. Upload separately for Mac, Linux, and Windows machines. All reports are in your account history.'],
            ['What are the scanner prerequisites?',
             'macOS and Linux: Python 3.8 or newer (pre-installed on macOS and most Linux distros). Windows: Download both Run_S3C_Scanner.bat and s3c_scan_windows.ps1 to the same folder, then double-click the .bat file. PowerShell 5.1+ is pre-installed on Windows 10 and 11 — no additional software required. Do not run the .ps1 directly from cmd.exe; Windows execution policy will silently block it.'],
          ].map(([q, a]) => (
            <div key={q}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{q}</div>
              <div className="text-muted">{a}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
