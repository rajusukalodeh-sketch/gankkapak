# Panduan Lengkap Strava Leaderboard (Hosting di Vercel & Lokal) — GANK KAPAK

Website **GANK KAPAK** kini sudah disesuaikan secara penuh untuk dapat di-hosting di **Vercel** dengan fitur **Serverless API + Auto Update (Edge Cache & Vercel Cron)**, serta tetap 100% kompatibel jika dijalankan di lingkungan lokal (Laragon).

---

## 🚀 Cara Kerja di Vercel

Di platform Vercel, server tidak memiliki disk penyimpanan permanen (serverless). Oleh karena itu, arsitektur pengambilan data Strava disesuaikan menggunakan **Vercel Serverless Function**:

1. **Endpoint API Serverless (`api/leaderboard.js`)**:
   - Berjalan otomatis di Node.js runtime Vercel tanpa perlu setup server sendiri.
   - Mengambil data aktivitas klub dari Strava API secara realtime.
   - Menghitung total kilometer pelari untuk bulan kalender berjalan dan memilih Top 5.
   - Menggunakan **Vercel Edge Caching (`s-maxage=1800`)**: Data di-cache selama 30 menit di CDN global Vercel sehingga respon sangat cepat (<50ms) dan tidak menghabiskan kuota rate limit Strava (100 request/15 menit).
2. **Auto Update Rutin**:
   - **Otomatis saat dikunjungi**: Setiap 30 menit sekali, Vercel otomatis memperbarui data Strava di latar belakang (*stale-while-revalidate*).
   - **Vercel Cron (`vercel.json`)**: Terjadwal otomatis melakukan ping ke `/api/leaderboard` untuk memastikan data selalu segar setiap hari.
3. **Frontend Cerdas (`assets/js/main.js`)**:
   - Otomatis memanggil `/api/leaderboard` saat web live di Vercel.
   - Jika dijalankan offline / di Laragon tanpa fungsi serverless, otomatis fallback membaca file statis `data/leaderboard.json`.
   - Jika kredensial Strava belum diisi, website otomatis menampilkan data simulasi (mock) sehingga website tidak pernah kosong atau error!

---

## 🔑 Langkah 1: Dapatkan Kunci Strava API (Gratis)

1. Login ke akun Strava admin klub Anda di browser: **https://www.strava.com/settings/api**.
2. Buat aplikasi baru:
   - **Application Name**: `Gank Kapak Website`
   - **Category**: `Club` atau `Other`
   - **Authorization Callback Domain**: Masukkan domain Vercel Anda (misal `gankkapak.vercel.app` atau `localhost`).
3. Catat **Client ID** dan **Client Secret**.
4. **Club ID**: Buka halaman klub Anda di Strava (`https://www.strava.com/clubs/[CLUB_ID]`). Angka di URL adalah ID klub Anda.
5. **Refresh Token**: Dapatkan refresh token dengan otorisasi scope `read,activity:read_all`.

---

## ☁️ Langkah 2: Setup di Vercel (Environment Variables)

Saat Anda menghubungkan repository GitHub ke Vercel:

1. Buka dashboard proyek Anda di **[Vercel Dashboard](https://vercel.com/)**.
2. Masuk ke menu **Settings** -> **Environment Variables**.
3. Tambahkan 4 variabel rahasia berikut:

| Key / Nama Variabel | Isi / Value | Keterangan |
| :--- | :--- | :--- |
| `STRAVA_CLIENT_ID` | `123456` | Client ID dari Strava API |
| `STRAVA_CLIENT_SECRET` | `abcdef123456...` | Client Secret dari Strava |
| `STRAVA_REFRESH_TOKEN` | `9876543210...` | Refresh Token admin klub |
| `STRAVA_CLUB_ID` | `1234567` | ID Klub Strava Anda |

4. Klik **Save** lalu lakukan **Redeploy** (Deploy ulang).
5. Selesai! Papan KM Anda di Vercel sekarang otomatis terhubung langsung ke Strava Club dan auto-update.

> 🔒 **Keamanan:** Kredensial rahasia Strava tersimpan aman di Environment Variables Vercel dan **tidak akan terekspos** ke publik atau file HTML/JS pengunjung.

---

## 💻 Penggunaan di Lingkungan Lokal (Laragon / Offline)

Jika Anda sedang mengembangkan atau menguji website di laptop/komputer sendiri (Laragon):

1. Salin file template `strava_config.example.json` menjadi `strava_config.json`.
2. Masukkan kredensial Strava Anda di file tersebut (file ini otomatis diabaikan oleh git via `.gitignore` agar tidak bocor ke publik).
3. Anda bisa memperbarui data statis kapan saja menggunakan:
   - **Browser**: Buka `http://localhost/testing/sync_strava.php`
   - **Terminal Python**: `python sync_strava.py`
   - **Terminal PHP**: `php sync_strava.php`

---

## 📁 Struktur File Pendukung

- [api/leaderboard.js](file:///e:/laragon/www/testing/api/leaderboard.js): Serverless function Node.js untuk Vercel.
- [vercel.json](file:///e:/laragon/www/testing/vercel.json): Konfigurasi cron job dan security header Vercel.
- [assets/js/main.js](file:///e:/laragon/www/testing/assets/js/main.js): Loader dinamis leaderboard dengan auto-detection API & fallback.
- [data/leaderboard.json](file:///e:/laragon/www/testing/data/leaderboard.json): Data leaderboard cadangan / fallback.
- [.gitignore](file:///e:/laragon/www/testing/.gitignore): Mencegah kebocoran file kredensial rahasia ke repository.
- [strava_config.example.json](file:///e:/laragon/www/testing/strava_config.example.json): Contoh format konfigurasi lokal.
