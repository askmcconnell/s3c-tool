# S3C-Tool Scanner — OS Compatibility & Integrity Guide

> **Audience:** S3C-Tool maintainers and contributors
> **Status:** 2.0 planning reference — items marked `[2.0]` are not yet implemented
> **Last updated:** 2026-04-19

---

## Overview

The S3C-Tool scanners collect software inventory from the local operating system using
OS-provided APIs, package managers, and registry/filesystem queries. Any of the following
can silently break data collection without crashing the scanner:

- A new major OS version changes a system call's output format or field names
- A field that previously held a version string is renamed, removed, or returns null
- A non-English OS locale causes field labels or date formats to differ from expected
- A package manager is deprecated in favour of a new one (e.g., apt → snap as primary)

This document captures what each scanner relies on, known risk points, and what to
validate when a new major OS version ships.

---

## Data Sources by Platform

### macOS (`s3c_scan_mac.py`)

| Source | API / Method | Key fields collected | Locale risk |
|--------|-------------|---------------------|-------------|
| Applications | `system_profiler SPApplicationsDataType` | Name, Version, Vendor | Low — structured JSON output |
| Homebrew | `brew list --versions` | Name, Version | None |
| Python packages | `pip3 list --format json` | Name, Version | None |
| Mac App Store | `mdfind kMDItemAppStoreHasReceipt` | Name | None |
| System frameworks | `/System/Library/Frameworks` plist | Name, Version | None |

**Primary risk:** Apple periodically changes `system_profiler` output structure between
major macOS releases. The `SPApplicationsDataType` JSON schema has been stable since
macOS 10.15 but should be validated on each major release.

**Tested on:** macOS 13 Ventura, macOS 14 Sonoma, macOS 15 Sequoia

---

### Linux (`s3c_scan_linux.py`)

| Source | API / Method | Key fields collected | Locale risk |
|--------|-------------|---------------------|-------------|
| Debian/Ubuntu | `dpkg-query --show --showformat` | Name, Version, Vendor | **HIGH** — output labels are locale-sensitive |
| RPM distros | `rpm -qa --queryformat` | Name, Version, Vendor | Medium |
| Snap | `snap list` | Name, Version, Publisher | Medium |
| Flatpak | `flatpak list --columns` | Name, Version, Application | Medium |
| Python (pip) | `pip3 list --format json` | Name, Version | None |
| Node (npm) | `npm list -g --json` | Name, Version | None |

**Primary risk:** `dpkg-query` and `rpm` output can vary by locale. On a French or
German system, date fields and some labels may differ from expected English format.
**Fix (2.0):** Prefix all package manager calls with `LANG=C LC_ALL=C` to force
POSIX/English output regardless of system locale.

**Tested on:** Debian 12 Bookworm, Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Fedora 39

**Untested / watch list:**
- Debian 13 Trixie (in testing as of 2026)
- Debian 14 Forky (future)
- Ubuntu 26.04 LTS
- Any RPM distro migrating away from `rpm` to an alternative

---

### Windows (`s3c_scan_windows.ps1`)

| Source | API / Method | Key fields collected | Locale risk |
|--------|-------------|---------------------|-------------|
| Registry (64-bit) | `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` | DisplayName, DisplayVersion, Publisher | Medium — DisplayName can be localised |
| Registry (32-bit) | `HKLM:\SOFTWARE\Wow6432Node\...\Uninstall` | Same as above | Medium |
| PowerShell packages | `Get-Package` | Name, Version, ProviderName | Low |
| Windows Store apps | `Get-AppxPackage` | Name, Version, Publisher | Low |

**Primary risk:** `DisplayName` in the registry is set by the software installer and
may be in the local language for region-specific software (e.g., Microsoft Office
localised editions). Version numbers (`DisplayVersion`) are almost always locale-independent.

**Fix (2.0):** Set culture at the top of the script:
```powershell
[System.Threading.Thread]::CurrentThread.CurrentCulture = [System.Globalization.CultureInfo]::InvariantCulture
```

**Tested on:** Windows 10 (21H2+), Windows 11 (22H2, 23H2)

**Untested / watch list:**
- Windows 12 (future)
- Any Windows release that deprecates legacy `Uninstall` registry keys

---

## Integrity Checks — What to Watch For

### 1. Field Rename / Schema Change

**Scenario:** An OS update renames an internal field (e.g., `Version` → `SW Version`,
or `DisplayVersion` removed in a future Windows release). The scanner does not crash
but returns null/empty for the version field across all rows from that source.

**Signal:** 500 rows returned, 500 have `version = null` or `version = ""`

**`[2.0]` Planned detection:**
- Scanner prints a per-source summary at completion:
  ```
  Sources:  Applications(412 rows, 411 with version)
            Homebrew(38 rows, 38 with version)
            Python(12 rows, 0 with version)  ← WARNING: version null across all rows
  ```
- Backend: flag any uploaded job where `version_null_pct > 80%` for a given source
  and surface it in the WP admin dashboard

**Current mitigation:** The CSV always includes `version` column — backend matching
falls back to name-only lookup if version is null, but match confidence drops.

---

### 2. New / Unknown OS Major Version in Uploaded Scans

**Scenario:** A user uploads a scan from macOS 16, Windows 12, or Debian 14 Forky —
OS versions that were not available when the scanner was written.

**Signal:** `os_version` field in CSV contains a major version not in the known-good list

**`[2.0]` Planned detection:**
- Backend maintains a list of tested OS versions per scanner (see tables above)
- When a job is processed with an unknown `os_version`, flag it in WP admin:
  *"New OS version detected: Debian 14 Forky — scanner output should be manually validated"*
- Does NOT block the scan — user still gets results

**Current mitigation:** None. The `os_version` field is captured but not inspected.

---

### 3. Empty Source (Package Manager Not Found or Changed)

**Scenario:** A Linux distro deprecates `dpkg` in favour of a new package manager.
The scanner runs but returns 0 rows from that source.

**Signal:** A source that normally returns 50–500 rows returns 0

**`[2.0]` Planned detection:**
- Scanner warns to stdout if any expected source returns 0 rows:
  `⚠ dpkg: 0 results — package manager may not be installed or output format changed`
- Backend: flag jobs where `row_count < 10` as potentially incomplete

---

## Localisation / International OS Concerns

### Problem Statement

S3C-Tool was developed and tested on English-language OS installations. Users running
non-English locale settings may experience silent data quality issues:

| Issue | Affected platform | Impact |
|-------|------------------|--------|
| Package manager field labels in local language | Linux (dpkg, rpm) | Field parsing fails — version returns null |
| Date format differences (DD/MM vs MM/DD) | Linux, Windows | `install_date` field incorrectly parsed |
| Localised `DisplayName` in Windows registry | Windows | Software name in non-English, reducing reference DB match rate |
| Multi-byte / non-ASCII software names | All | CSV encoding issues if not UTF-8 |
| Decimal separator (comma vs period) | Windows, some Linux | Version strings like "14,3" instead of "14.3" |

### `[2.0]` Planned Fixes

**Linux scanner:**
```bash
# Prefix all package manager calls with locale override
LANG=C LC_ALL=C dpkg-query --show --showformat='${Package}\t${Version}\n'
```

**Windows scanner:**
```powershell
# Force invariant culture at script start
[System.Threading.Thread]::CurrentThread.CurrentCulture =
    [System.Globalization.CultureInfo]::InvariantCulture
[System.Threading.Thread]::CurrentThread.CurrentUICulture =
    [System.Globalization.CultureInfo]::InvariantCulture
```

**All scanners:**
- Explicitly write CSV with `encoding='utf-8-sig'` (UTF-8 with BOM) to handle
  non-ASCII software names gracefully on all platforms
- Add `locale_hint` field to CSV (e.g., `en_US`, `fr_FR`, `ja_JP`) so the backend
  knows to apply locale-aware matching

**Backend matching:**
- Normalise software names before reference DB lookup: strip diacritics, normalise
  Unicode to NFC, trim whitespace
- Log locale distribution from uploaded scans to identify which locales are most common
  among the user base — prioritise testing accordingly

---

## OS Release Watch List

Monitor these for breaking changes on or after release:

| OS | Release | Expected | Priority |
|----|---------|----------|----------|
| Debian 13 Trixie | Mid-2025 | Python 3.12 as default, possible dpkg changes | Medium |
| Debian 14 Forky | ~2027 | TBD | Low |
| Ubuntu 26.04 LTS | April 2026 | Snap as primary package manager? | Medium |
| macOS 16 | ~WWDC 2026 | Potential system_profiler schema changes | Medium |
| Windows 12 | ~2026–2027 | Registry key deprecation possible | Low |

**When a new major OS ships:**
1. Run the scanner on a fresh install (VM is fine)
2. Verify row count is in expected range for the platform
3. Verify `version` field is populated on >90% of rows
4. Verify `software_name` field is populated on 100% of rows
5. Compare field counts to last known-good run
6. Update the "Tested on" table in this document
7. If a source breaks, file a GitHub issue and patch the scanner

---

## Admin Notifications — Current vs Planned

| Signal | Current | `[2.0]` Planned |
|--------|---------|-----------------|
| New OS major version in scan | Nothing | WP admin flag |
| Version null > 80% of rows | Nothing | WP admin flag + email |
| Row count < 10 | Nothing | WP admin flag |
| Non-English locale detected | Nothing | Log to admin dashboard |
| Source returns 0 rows | Nothing | Scanner stdout warning |

---

---

## External Data Source Changes

### NIST NVD — April 2026 Policy Change

**Reference:** https://www.nist.gov/news-events/news/2026/04/nist-updates-nvd-operations-address-record-cve-growth

NIST updated NVD operations to address a 263% surge in CVE submissions (2020–2025).
NVD now uses **risk-based prioritization**:

- CVEs in CISA's Known Exploited Vulnerabilities (KEV) catalog → enriched with CVSS, CWE, CPE
- Federal government / EO 14028 critical software CVEs → enriched
- All other CVEs → listed but marked *"Lowest Priority — not scheduled for immediate enrichment"*
  (no CVSS score, no severity rating, no CPE data)

**Impact on S3C-Tool:**
The Pi agent's NVD enrichment (`--nvd-enrich`) pulls `cve_count` and severity
breakdowns from the NVD 2.0 API. As NIST's backlog of unenriched CVEs grows,
severity data will be silently incomplete for lower-priority CVEs. The `cve_count`
may be accurate but `cve_critical` / `cve_high` / `cve_medium` / `cve_low` may
show zero even when vulnerabilities exist.

**`[2.0]` Planned mitigation:**
Add CISA KEV as a separate enrichment source (GH issue #10):
- KEV JSON feed: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- KEV matches = actively exploited in the wild → highest priority finding
- Surface as distinct "⚠ Actively Exploited" badge in results UI
- KEV is unaffected by NVD's prioritization policy

**Current mitigation:**
Dashboard NVD section includes a caveat noting NIST's April 2026 policy change.

---

*This document should be updated each time a scanner is tested on a new OS version,
when a breaking change is discovered and patched, or when an external data source
changes its API, coverage, or enrichment policy.*
