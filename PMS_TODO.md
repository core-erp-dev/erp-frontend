# PMS — Remaining TODO

## 1. Dashboard berbasis user

Buat Dashboard utama PMS yang menyesuaikan konteks user.

Dashboard tidak boleh identik untuk semua user.

Informasi yang ditampilkan dapat mencakup sesuai hak akses dan posisi user:

- Aktivitas sendiri.
- Aktivitas bawahan.
- Progress/performa relevan.
- Request atau approval yang membutuhkan tindakan.
- Laporan yang perlu direview.
- Shortcut menuju pekerjaan penting.

Pastikan dashboard mengikuti permission dan hierarchy yang sudah berlaku pada PMS.

## 2. SPA / navigation behavior

Audit navigation frontend agar perpindahan halaman internal konsisten sebagai SPA.

Periksa antara lain:

- Internal navigation tidak menyebabkan full-page reload yang tidak perlu.
- Penggunaan router/link konsisten.
- Penggunaan `window.location` atau hard redirect yang tidak diperlukan.
- State/filter yang seharusnya bertahan tidak hilang akibat pola navigasi yang salah.

Jangan mengubah routing architecture tanpa kebutuhan nyata.

## 3. Optimistic locking

Audit dan terapkan optimistic locking berbasis version untuk resource yang dapat diedit secara concurrent.

Pastikan:

- Entity relevan mempunyai version.
- Update menggunakan version data yang dibaca user.
- Stale update tidak melakukan silent overwrite.
- Backend menghasilkan conflict yang terkontrol.
- Frontend dapat memberi tahu user bahwa data sudah berubah dan perlu dimuat ulang.

Audit terlebih dahulu karena sebagian entity mungkin sudah memiliki mekanismenya.

## 4. Multiple pending Report pada Activity yang sama

Review business rule Report.

Target rule:

> Satu Activity diperbolehkan mempunyai lebih dari satu Report berstatus `PENDING` secara bersamaan.

Audit Backend dan Frontend yang masih mengasumsikan hanya boleh ada satu pending Report.

Periksa minimal:

- Validation saat submit.
- Query/list Report.
- Review queue.
- Activity detail.
- Kalkulasi realisasi/progress.
- Test terkait.

Report `PENDING` tidak boleh memengaruhi realisasi/progress sampai Report tersebut disetujui.

## 5. Standardisasi loading dan tabel Frontend

Rapikan pola bersama untuk halaman list/table.

Standardisasi minimal:

- Loading awal.
- Loading ketika filter/search/pagination berubah.
- Bagian UI yang menjadi loading/skeleton.
- Tinggi row/cell tabel.
- Empty state.
- Error state.
- Layout tidak meloncat secara berlebihan saat fetch.

Gunakan pattern existing yang sudah paling matang daripada membuat lifecycle baru untuk tiap halaman.

## 6. Semua filter list harus server-side

Audit halaman yang memiliki:

- Search.
- Filter.
- Sorting.
- Pagination.

Filter terhadap dataset API tidak boleh hanya dilakukan pada data page yang sudah diterima Frontend.

Backend harus mendukung filter yang diperlukan sehingga:

- Hasil pagination benar.
- Total data benar.
- Filter berlaku terhadap keseluruhan dataset.
- Frontend hanya mengirim query parameter dan merender hasil Backend.

## 7. Perbaiki browser history / navigation

Audit behavior tombol Back dan history pada halaman CRUD/detail.

Known issue:

`Position list → Position detail → Edit Position → Back`

dapat kembali ke halaman detail ketika flow yang diharapkan pada kondisi tertentu adalah kembali ke list/table.

Audit secara konsisten untuk:

- List → detail → edit.
- List → create.
- Save.
- Cancel.
- Browser back.
- Tombol back custom.
- Breadcrumb.

Tujuannya bukan memaksa semua halaman selalu kembali ke list, tetapi membuat navigation semantics konsisten dan tidak menghasilkan history entry yang tidak diperlukan.

## 8. Standardisasi endpoint data pendukung form

Audit semua form create/edit.

Data pilihan seperti:

- Position.
- Parent.
- Assignee.
- Corporate KPI.
- Reviewer.
- Role.
- Lookup lain.

jangan otomatis mengambil endpoint management/list besar kemudian difilter sendiri oleh Frontend.

Jika pilihan mempunyai business rule, hierarchy, permission, atau eligibility tertentu, sediakan/use endpoint khusus form options/lookup.

Endpoint opsi harus:

- Hanya mengembalikan pilihan yang memang eligible.
- Menerapkan permission/scope pada Backend.
- Mendukung search/pagination jika dataset besar.
- Tidak membocorkan data yang seharusnya tidak menjadi pilihan user.

Audit endpoint existing terlebih dahulu sebelum membuat endpoint baru.

## 9. Audit optional field yang tidak bisa di-reset

Cari field form yang secara domain nullable/optional tetapi setelah user memilih nilai, UI tidak menyediakan cara kembali ke kondisi kosong.

Pattern masalah:

`null → pilih value → tidak bisa kembali menjadi null`

Untuk field seperti ini:

- Sediakan clear option seperti `Tanpa ...`, `Tidak ada`, atau clear selection sesuai konteks.
- Pastikan Frontend dapat mengirim intent untuk menghapus value.
- Pastikan Backend mendukung reset menjadi `null`.
- Pada PATCH/partial update, pastikan dapat dibedakan antara field tidak diubah dan field sengaja di-clear.

Audit seluruh form, jangan hanya satu halaman.

## Catatan

Jangan masukkan ke TODO:

- Refresh token interceptor.
- Penambahan Role pada detail Position.
- Catatan commit/reference styling lama.
- Catatan development convenience yang bukan pekerjaan project.

Dokumen ini ditujukan kepada developer berikutnya, jadi tulis sebagai backlog implementasi, bukan percakapan atau catatan pribadi.
