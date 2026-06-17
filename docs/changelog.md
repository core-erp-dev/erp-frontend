# Changelog

## 2026-06-18

### fix(frontend): resolve 4 active browser warnings from audit

**Step 1 — Fix Active Browser Warnings:**

- `sidebar.tsx:123` — Fix Image aspect ratio warning: tambah `width: "auto"` ke inline style Next.js `<Image>`
- `position-table.tsx:123` — Ganti native `<button>` tree expand/collapse dengan HeroUI `<Button isIconOnly variant="ghost">` + `aria-label`
- `hierarchy-view.tsx:179` — Fix PressResponder warning: ganti `<Button slot="chevron">` dengan `<span>` indicator (React Aria tree Table handles row click)
- `settings/page.tsx:19` — Ganti native `<button>` settings card dengan HeroUI `<Button variant="ghost" aria-label="...">`

### chore(docs): organize documentation

- Pindahkan semua `.md` file ke `docs/` folder
- Buat `docs/plan.md` — 5-step remediation plan
- Buat `docs/changelog.md`
- Buat `docs/FRONTEND_AUDIT_REPORT.md` — comprehensive audit report
