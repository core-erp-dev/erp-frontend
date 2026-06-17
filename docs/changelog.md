# Changelog

## 2026-06-18

### fix(frontend): resolve 4 active browser warnings from audit

**Step 1 — Fix Active Browser Warnings:**

- `sidebar.tsx:123` — Fix Image aspect ratio warning: tambah `width: "auto"` ke inline style Next.js `<Image>`
- `position-table.tsx:123` — Ganti native `<button>` tree expand/collapse dengan HeroUI `<Button isIconOnly variant="ghost">` + `aria-label`
- `hierarchy-view.tsx:179` — Fix PressResponder warning: ganti `<Button slot="chevron">` dengan `<span>` indicator (React Aria tree Table handles row click)
- `settings/page.tsx:19` — Ganti native `<button>` settings card dengan HeroUI `<Button variant="ghost" aria-label="...">`

### refactor(arch): delete duplicate /hr/hierarchy route, rename folder to positions/

**Step 2 — Architecture Cleanup:**

- Hapus `app/(main)/hr/hierarchy/` route (duplicate of `/hr/positions`)
- Rename `modules/hr/hierarchy/` → `modules/hr/positions/`
- Update 22 import paths di seluruh codebase
