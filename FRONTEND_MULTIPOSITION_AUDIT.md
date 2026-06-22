# FRONTEND MULTI-POSITION AUDIT

> **Target:** Semua halaman & komponen Frontend ERP
> **Aturan Bisnis:** 1 Karyawan → BANYAK Jabatan Aktif, 1 Jabatan Utama (`isPrimary=true`)
> **Tanggal:** 23 Juni 2026
> **Auditor:** Senior UI/UX Architect & Next.js Expert

---

## Ringkasan Eksekutif

**Cacat Fundamental:** Hampir seluruh layer Frontend saat ini mengasumsikan **1 Karyawan = 1 Jabatan**. Padahal arsitektur backend (PBAC) secara native mendukung multi-position — `CoreUser.userPositions` adalah `List<UserPosition>`. Backend sudah benar, frontend yang tertinggal.

**Akar Masalah:**
1. Backend `CoreUserResponse.mapToResponse()` hanya mengekspos `primaryPosition` (single) — tidak ada `positions` array.
2. Frontend type `CoreUser` hanya punya `primaryPosition: PrimaryPosition | null` — tidak ada `positions: UserPositionResponse[]`.
3. Semua UI mengkonsumsi field tunggal tersebut.

**Dampak:** Karyawan dengan 3 jabatan (1 utama + 2 rangkap/Plt) hanya terlihat memiliki 1 jabatan di seluruh UI.

---

## 1. Daftar Halaman/Komponen Terdampak

| # | Halaman / Komponen | File | Severity |
|---|-------------------|------|----------|
| 1 | Tabel Daftar Karyawan | `modules/hr/employees/components/data-table.tsx` | 🔴 CRITICAL |
| 2 | Halaman Detail Karyawan | `app/(main)/hr/employees/[id]/page.tsx` | 🔴 CRITICAL |
| 3 | Form Tambah/Edit Karyawan | `modules/hr/employees/components/employee-form.tsx` | 🔴 CRITICAL |
| 4 | Filter Jabatan di List Karyawan | `app/(main)/hr/employees/page.tsx` + `use-employee-data.ts` | 🟡 HIGH |
| 5 | Halaman Detail Jabatan | `app/(main)/hr/positions/[id]/page.tsx` | 🟡 HIGH |
| 6 | Tabel Jabatan (Tree View) | `modules/hr/positions/components/position-table.tsx` | 🟡 HIGH |
| 7 | Global Search (Header) | `components/layout/header.tsx` | 🟠 MEDIUM |
| 8 | Sidebar / Top Navigation | `components/layout/sidebar.tsx` | 🟢 LOW |
| 9 | Modul KPI — Tugas per Jabatan | `modules/hr/kpi/components/task-form-modal.tsx` + `task-data-table.tsx` | 🟡 HIGH |
| 10 | Modul KPI — Capaian KPI | `app/(main)/hr/kpi/performance/page.tsx` | 🟠 MEDIUM |
| 11 | Modul KPI — Laporan Harian | `modules/hr/kpi/components/daily-report-modal.tsx` | 🟠 MEDIUM |
| 12 | Assign User Modal | `modules/hr/employees/components/assign-user-modal.tsx` | 🟡 HIGH |
| 13 | Export / Laporan (belum ada) | N/A (future) | 🟠 MEDIUM |
| 14 | Profile Dropdown (Header) | `components/layout/header.tsx` | 🟢 LOW |
| 15 | Auth Store / User Context | `store/auth-store.ts` + `types/auth.ts` | 🟠 MEDIUM |

---

## 2. Audit Per Halaman/Komponen

---

### 2.1 Tabel Daftar Karyawan (`data-table.tsx`)

**Asumsi Lama (Cacat):**
```tsx
// HANYA menampilkan 1 jabatan (primary)
<Table.Cell>
  {emp.primaryPosition ? emp.primaryPosition.positionName : '-'}
</Table.Cell>
```

Kolom "Jabatan" hanya menampilkan nama jabatan utama. Jika karyawan memiliki 3 jabatan, 2 lainnya tidak terlihat.

**Solusi UI/UX Baru:**

Gunakan **Badge Group + Tooltip** untuk menampilkan semua jabatan dalam satu cell:

```
┌──────────────────────────────────────────────────────────┐
│ Nama          │ Email              │ Jabatan             │
├──────────────────────────────────────────────────────────┤
│ Budi Santoso  │ budi@example.com   │ [Manager HRD] +2 ⟶  │
│                                   │   Hover: "Manager HRD (Utama)"        │
│                                   │          "Staff Finance (Rangkap)"     │
│                                   │          "Plt. Kabag Umum (Rangkap)"  │
└──────────────────────────────────────────────────────────┘
```

**Implementasi (HeroUI):**
```tsx
<Table.Cell>
  {emp.positions && emp.positions.length > 0 ? (
    <div className="flex items-center gap-1.5">
      {/* Primary position badge */}
      {emp.positions.filter(p => p.isPrimary && p.isActive).map(p => (
        <span key={p.id} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {p.positionName}
          <Crown className="ml-1 h-3 w-3" />  {/* Icon utama */}
        </span>
      ))}
      {/* Extra count badge + Tooltip */}
      {emp.positions.filter(p => !p.isPrimary && p.isActive).length > 0 && (
        <Tooltip>
          <Tooltip.Trigger>
            <span className="inline-flex items-center rounded-full bg-surface-secondary px-1.5 py-0.5 text-xs text-muted-foreground cursor-help">
              +{emp.positions.filter(p => !p.isPrimary && p.isActive).length}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <div className="flex flex-col gap-1 text-xs">
              {emp.positions.filter(p => !p.isPrimary && p.isActive).map(p => (
                <span key={p.id}>{p.positionName} (Rangkap)</span>
              ))}
            </div>
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  ) : (
    <span className="text-gray-400">-</span>
  )}
</Table.Cell>
```

**Perubahan Payload API:**
- **Dibutuhkan:** Backend `CoreUserResponse` harus menambahkan field `List<UserPositionResponse> positions` (semua posisi aktif).
- Frontend `CoreUser` type harus menambahkan `positions: UserPositionResponse[]`.

---

### 2.2 Halaman Detail Karyawan (`employees/[id]/page.tsx`)

**Asumsi Lama (Cacat):**
```tsx
const pos = employee.primaryPosition;
// ...
<Field label="Jabatan" value={pos?.positionName || '-'} />
```

Hanya menampilkan 1 jabatan. Karyawan dengan multiple positions kehilangan informasi penting.

**Solusi UI/UX Baru:**

Tambahkan **Surface "Daftar Jabatan"** baru yang menampilkan semua posisi dengan indikator visual:

```
┌─────────────────────────────────────────────┐
│ DAFTAR JABATAN                              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 👑 Manager HRD                  Utama   │ │
│ │    Mulai: 01/01/2025                    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Staff Finance               Rangkap  │ │
│ │    Mulai: 15/03/2025                    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Plt. Kabag Umum             Rangkap  │ │
│ │    Mulai: 01/06/2025 • S/d: 31/12/2025 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Implementasi (HeroUI):**
```tsx
<Surface className="rounded-3xl p-6">
  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
    Daftar Jabatan
  </h2>
  <div className="space-y-2">
    {employee.positions?.filter(p => p.isActive).map(up => (
      <div
        key={up.id}
        className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {up.isPrimary ? (
            <Crown className="h-5 w-5 text-amber-500" />
          ) : (
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <span className="font-medium text-foreground">{up.positionName}</span>
            <span className="ml-2 text-xs text-gray-400">{up.positionCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={up.isPrimary ? 'primary' : 'secondary'} size="sm">
            {up.isPrimary ? 'Utama' : 'Rangkap'}
          </Badge>
          <span className="text-xs text-gray-400">
            {formatDate(up.startDate)}
            {up.endDate && ` • s/d ${formatDate(up.endDate)}`}
          </span>
        </div>
      </div>
    ))}
  </div>
</Surface>
```

**Data Kepegawaian** section tetap menampilkan `primaryPosition` sebagai ringkasan cepat.

**Perubahan Payload API:**
- Sama seperti #2.1: `CoreUserResponse.positions` + Frontend type update.

---

### 2.3 Form Tambah/Edit Karyawan (`employee-form.tsx`)

**Asumsi Lama (Cacat):**
```tsx
// Hanya "Jabatan" (singular) — memilih primary/default position
defaultPositionId: z.string().optional(),
// ...
<Controller name="defaultPositionId" render={...}>
  <Select ... placeholder="Pilih jabatan">
```

Form hanya bisa memilih 1 jabatan utama. Tidak ada mekanisme untuk menambah jabatan rangkap.

**Solusi UI/UX Baru:**

**Create Mode:** Tetap 1 dropdown untuk jabatan utama (default). Jabatan rangkap ditambahkan setelah karyawan dibuat, via Assign modal dari halaman detail.

**Edit Mode:** Dua section berbeda:

1. **Jabatan Utama:** Dropdown Select (existing, tetap).
2. **Jabatan Rangkap:** List existing secondary positions + tombol "Tambah Rangkap" yang membuka inline Assign mini-form.

```
┌─────────────────────────────────────────────┐
│ DATA KEPEGAWAIAN                            │
│                                             │
│ NIP: [____________]  Jabatan Utama: [▼____] │
│ Tanggal Bergabung: [__________]             │
│                                             │
│ ─── JABATAN RANGKAP ───                     │
│ ┌──────────────────────────────────────┐    │
│ │ Staff Finance      Sejak 15/03/2025  │    │
│ │                        [✕ Lepas]     │    │
│ └──────────────────────────────────────┘    │
│ ┌──────────────────────────────────────┐    │
│ │ Plt. Kabag Umum    Sejak 01/06/2025  │    │
│ │                        [✕ Lepas]     │    │
│ └──────────────────────────────────────┘    │
│                                             │
│ [+ Tambah Jabatan Rangkap]                  │
└─────────────────────────────────────────────┘
```

**Flow "Tambah Jabatan Rangkap":**
- Klik tombol → inline SearchField muncul
- Cari jabatan → pilih → langsung assign `isPrimary: false`
- Tombol "Lepas" → set `isActive: false, endDate: now`

**Perubahan Payload API:**
- Untuk "Lepas" dibutuhkan endpoint `PATCH /api/v1/employees/user-positions/{id}/deactivate` (atau `DELETE`)
- Assign menggunakan existing `POST /api/v1/employees/user-positions` dengan `isPrimary: false`
- Backend perlu endpoint `GET /api/v1/users/{id}/positions` untuk fetch semua posisi

---

### 2.4 Filter "Jabatan" di List Karyawan (`employees/page.tsx`)

**Asumsi Lama (Cacat):**
```tsx
// Filter single position — backend sudah mendukung multi-position query
setJabatanId(newJabatanId); // number | null
// Backend query: EXISTS (SELECT 1 FROM UserPosition up WHERE up.position.id = :positionId)
```

**Ini sebenarnya sudah BENAR di layer query.** Backend query `findFilteredUsers` menggunakan `EXISTS` pada `UserPosition` — filter by ANY position (bukan hanya primary). Namun, filter UI hanya single-select.

**Solusi UI/UX Baru:**

**Pertahankan single-select filter** (UX standar: filter 1 jabatan pada satu waktu). Tapi **ganti implementasi** dari `number` ke `string` karena ID adalah UUID. Dan pastikan UI konsisten:

```
[🔽 Filter: Jabatan ▼]    [🔽 Urut ▼]
 ┌─────────────────────┐
 │ ✓ Manager HRD        │  ← selected
 │   Staff Finance      │
 │   Kabag Umum         │
 │   ...                │
 └─────────────────────┘
```

**Perubahan Payload API:**
- `jabatanId` type di frontend harus diganti dari `number` ke `string` (UUID).
- Backend filter param `positionId` sudah `UUID` — tidak perlu berubah.

---

### 2.5 Halaman Detail Jabatan (`positions/[id]/page.tsx`)

**Asumsi Lama (Cacat):**
```tsx
// Assign karyawan selalu isPrimary: false
await employeeApi.assignUserToPosition({
  userId, positionId: id,
  startDate: new Date().toISOString().split('T')[0],
  isPrimary: false  // ← selalu false!
});
```

Tidak ada opsi untuk menetapkan assignee sebagai pemegang utama.

**Solusi UI/UX Baru:**

1. **Daftar Karyawan section:** Tampilkan badge "Utama" / "Rangkap" pada setiap karyawan. Bedakan visual:
   - Nama **bold + crown icon** untuk pemegang utama
   - Nama normal untuk rangkap

```
┌─────────────────────────────────────────────┐
│ DAFTAR KARYAWAN                    [+Tugaskan]│
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 👑 Budi Santoso                       │ │
│ │    Utama • budi@example.com            │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │    Siti Aminah                        │ │
│ │    Rangkap • siti@example.com          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

2. **Inline Assign Form:** Tambahkan Switch isPrimary (seperti di AssignUserModal):
```tsx
<Switch isSelected={isPrimary} onChange={setIsPrimary}>
  <Label>Jadikan Jabatan Utama</Label>
  <Description>Jabatan utama sebelumnya akan otomatis ditutup.</Description>
</Switch>
```

**Perubahan Payload API:**
- Backend `POST /api/v1/employees/user-positions` sudah menerima field `isPrimary: boolean` — **tidak perlu berubah.**
- Backend perlu memastikan bahwa saat `isPrimary: true` dikirim, posisi utama sebelumnya otomatis di-nonaktifkan. (Perlu dicek di `EmployeeServiceImpl.assignUserPosition`).

---

### 2.6 Tabel Jabatan — Tree View (`position-table.tsx`)

**Asumsi Lama:**
```tsx
// User count = total assigned, no primary/secondary distinction
<span>{row.userCount}</span>
```

**Solusi UI/UX Baru:**

Sama seperti #2.5, tidak perlu perubahan besar. Cukup pastikan jumlahnya akurat. Jika diinginkan granularitas lebih, bisa split:

```
Karyawan: 3 (1 Utama + 2 Rangkap)
```

Tapi untuk tabel, cukup `3` dengan Tooltip yang menampilkan breakdown.

**Perubahan Payload API:**
- Backend `Position.assignedUsers` sudah mengembalikan list — tapi tanpa flag `isPrimary`. Jika ingin menampilkan breakdown, backend perlu menyertakan field `isPrimary` di `AssignedUser` response (perluasan `PositionTree.assignedUsers`).

---

### 2.7 Global Search (Header)

**Asumsi Lama (Cacat):**
Search field di header saat ini tidak fungsional (placeholder "Cari"). Ketika diimplementasikan, harus mengembalikan hasil yang menunjukkan **semua jabatan** karyawan, bukan hanya primary.

**Solusi UI/UX:**

Global search (seperti Spotlight/Command Palette) yang menampilkan:
```
┌──────────────────────────────────────────┐
│ 🔍 "budi"                                │
├──────────────────────────────────────────┤
│ 👤 Budi Santoso                          │
│    Manager HRD • NIP: 12345              │
│    + 2 jabatan lainnya                   │
├──────────────────────────────────────────┤
│ 📋 Budi Hartono                          │
│    Staff Finance • NIP: 67890            │
└──────────────────────────────────────────┘
```

**Perubahan Payload API:**
- Search endpoint harus mengembalikan `primaryPositionName` + `positionCount`.

---

### 2.8 Sidebar / Top Navigation

**Dampak:** Rendah. Sidebar hanya navigasi statis. Tidak ada perubahan yang diperlukan.

---

### 2.9 Modul KPI — Tugas per Jabatan (`task-form-modal.tsx`)

**Asumsi Lama (Cacat):**
```tsx
// Tugas KPI di-assign ke SATU jabatan
positionId: z.string().min(1, 'Pilih posisi'),
```

KPI task di-assign per `(position, corporateKpi)`. Untuk karyawan dengan multiple positions, mereka akan melihat tugas KPI dari semua jabatannya — **ini sebenarnya sudah benar** karena tugas melekat pada jabatan, bukan orang.

**Yang Perlu Dicek:**
- Apakah backend `TaskFilterParams.employeeId` sudah mem-filter tasks dari SEMUA posisi karyawan? Jika ya → OK.
- Jika hanya primary position → BUG.

**Solusi UI/UX:**
- Di halaman "Tugas KPI Saya", tambahkan filter/group by jabatan:
```
┌────────────────────────────────────────────┐
│ TUGAS KPI SAYA                             │
│                                            │
│ [▼ Semua Jabatan]  [▼ Status]             │
│                                            │
│ ── Manager HRD (Utama) ──                  │
│ ☐ KPI-001  Target Tahunan  85%             │
│ ☐ KPI-002  Laporan Bulanan  60%            │
│                                            │
│ ── Staff Finance (Rangkap) ──              │
│ ☐ KPI-003  Rekonsiliasi    100% ✓          │
└────────────────────────────────────────────┘
```

**Perubahan Payload API:**
- Backend `TaskFilterParams.employeeId` harus filter tasks dari **semua** active positions milik employee (bukan hanya primary). Cek di `TaskServiceImpl`.

---

### 2.10 Performance Summary (`PerformanceSummaryResponse`)

**Asumsi Lama (Cacat):**
```tsx
export interface PerformanceSummaryResponse {
  positionName: string;  // ← SINGLE!
}
```

**Solusi:**
- Performance summary harus bisa di-filter per jabatan, atau menampilkan semua.

**Perubahan Payload API:**
- Backend `PerformanceSummaryResponse` perlu diganti dari `positionName: string` menjadi `positions: { positionName: string; isPrimary: boolean }[]`.

---

### 2.11 Laporan Harian (`daily-report-modal.tsx`)

**Dampak:** KPI reports melekat pada task (yang melekat pada position). Tidak ada asumsi 1:1 employee↔position di sini. Namun, saat employee submit laporan, pastikan konteks jabatannya jelas.

**Solusi:** Report list/detail menampilkan nama jabatan tempat tugas tersebut berasal.

---

### 2.12 Assign User Modal (`assign-user-modal.tsx`)

**Asumsi Saat Ini:**
```tsx
const [formData, setFormData] = useState<FormData>({
  isPrimary: true,  // ← default true, tidak ada validasi
});
```

**Solusi UI/UX:**

Modal sudah cukup baik dengan Switch `isPrimary`. Yang perlu diperbaiki:

1. **Warning yang lebih jelas** saat `isPrimary: true`:
   > ⚠️ Jabatan utama saat ini ("Manager HRD") akan otomatis dinonaktifkan.

2. **Validasi backend:** Pastikan backend menangani kasus:
   - Assign `isPrimary: true` → nonaktifkan primary lama
   - Assign `isPrimary: false` → biarkan primary tetap

**Perubahan Payload API:**
- Tidak perlu perubahan. Backend harus memastikan logika ini di `EmployeeServiceImpl.assignUserPosition()`.

---

### 2.13 Auth Store / User Context

**Kondisi Saat Ini:**
```tsx
// types/auth.ts
export interface User {
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  // TIDAK ADA position info
}
```

**Dampak:** Header tidak bisa menampilkan jabatan user. Untuk MVP, ini bisa ditunda. Untuk future: tambahkan `primaryPositionName?: string`.

---

## 3. Matriks Perubahan Payload API

| # | Backend Endpoint | Perubahan yang Dibutuhkan | Prioritas |
|---|-----------------|--------------------------|-----------|
| 1 | `GET /api/v1/users` (list) | Tambah field `positions: UserPositionResponse[]` di `CoreUserResponse` | 🔴 CRITICAL |
| 2 | `GET /api/v1/users/{id}` (detail) | Sama seperti #1 | 🔴 CRITICAL |
| 3 | `GET /api/v1/users/{id}/positions` | **ENDPOINT BARU** — ambil semua posisi satu karyawan | 🔴 CRITICAL |
| 4 | `PATCH /api/v1/employees/user-positions/{id}/deactivate` | **ENDPOINT BARU** — lepas jabatan rangkap | 🟡 HIGH |
| 5 | `POST /api/v1/employees/user-positions` | Pastikan `isPrimary: true` otomatis nonaktifkan primary lama | 🟡 HIGH |
| 6 | `GET /api/v1/employees/positions/tree` | Tambah field `isPrimary` di `AssignedUser` response (opsional) | 🟠 MEDIUM |
| 7 | KPI `GET /api/v1/kpi/tasks?employeeId=` | Pastikan filter tasks dari semua posisi, bukan hanya primary | 🟡 HIGH |
| 8 | KPI `GET /api/v1/kpi/performance?employeeId=` | Ganti `positionName: string` → `positions: [{...}]` | 🟠 MEDIUM |

---

## 4. Prioritas Implementasi

```
FASE 1 (CRITICAL — Minggu 1)
├── Backend: Tambah `positions` array ke `CoreUserResponse.mapToResponse()`
├── Backend: Endpoint `GET /api/v1/users/{id}/positions`
├── Frontend: Update `CoreUser` type + `PrimaryPosition` → positions array
├── Frontend: Tabel Daftar Karyawan — Badge Group multi-position
├── Frontend: Detail Karyawan — Surface "Daftar Jabatan"
└── Frontend: Detail Karyawan — Data Kepegawaian tetap pakai primaryPosition

FASE 2 (HIGH — Minggu 2)
├── Backend: Endpoint deactivate user-position + auto-nonaktif primary lama
├── Frontend: Form Edit Karyawan — Section Jabatan Rangkap
├── Frontend: AssignUserModal — Warning primary lama
├── Frontend: Detail Jabatan — Badge Utama/Rangkap di daftar karyawan
└── Backend: KPI filter by employeeId → semua posisi

FASE 3 (MEDIUM — Minggu 3)
├── Backend: Performance summary per-position
├── Frontend: Global Search dengan position count
└── Frontend: KPI task list grouped by position
```

---

## 5. Edge Cases & Efek Domino

### 5.1 Soft Delete Karyawan
Saat karyawan di-soft-delete, **semua** UserPosition-nya di-nonaktifkan (`isActive=false`). Saat direstore, posisi tetap inactive — HR harus reassign manual. UI harus mencerminkan ini dengan jelas.

### 5.2 Transfer Jabatan Utama
Saat user mengubah `defaultPositionId` di form edit:
- Backend harus menonaktifkan primary lama
- Membuat UserPosition baru dengan `isPrimary=true`
- UI harus langsung merefleksikan perubahan (refresh setelah submit)

### 5.3 Employee dengan 0 Jabatan
Karyawan baru bisa dibuat tanpa jabatan (`defaultPositionId = null`). UI sudah menangani ini dengan menampilkan "-". Tetap valid.

### 5.4 Assign Jabatan yang Sama 2x
Backend harus mencegah duplicate `(userId, positionId, isActive=true)`. Frontend harus men-disable posisi yang sudah di-assign di dropdown.

### 5.5 Export Excel
Ketika fitur export dibuat, satu karyawan dengan N jabatan harus di-handle. Pilihan:
- **Flat:** 1 row per karyawan, kolom "Jabatan" = "Manager HRD, Staff Finance, Plt. Kabag Umum"
- **Normalized:** 1 row per (karyawan, jabatan), NIP & Nama diulang

---

## 6. Referensi Arsitektur Backend

```
CoreUser
├── id: UUID
├── fullName: String
├── userPositions: List<UserPosition>     ← SUPPORTS MULTI
│   ├── UserPosition[0]: isPrimary=true, isActive=true  → Manager HRD
│   ├── UserPosition[1]: isPrimary=false, isActive=true → Staff Finance
│   └── UserPosition[2]: isPrimary=false, isActive=true → Plt. Kabag Umum
│
├── getPrimaryPosition()                  ← returns UserPosition where isPrimary=true AND isActive=true
├── getAllPermissionCodes()               ← resolves across ALL active positions (PBAC)
└── userRoles: List<UserRole>
```

**Mapping saat ini (CACAT):**
```
CoreUserResponse {
  primaryPosition: UserPositionResponse | null   ← HANYA 1
  // TIDAK ADA positions: List<UserPositionResponse>
}
```

**Mapping yang dibutuhkan (FIX):**
```
CoreUserResponse {
  primaryPosition: UserPositionResponse | null   ← tetap untuk kompatibilitas
  positions: List<UserPositionResponse>          ← BARU — semua posisi aktif
}
```
