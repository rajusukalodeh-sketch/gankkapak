# Panduan Otomatisasi Strava Leaderboard (Opsi A) — GANK KAPAK

Website GANK KAPAK menggunakan **Opsi A (Paling Populer & Praktis)** untuk sinkronisasi Papan KM dari Strava Club.

Sistem bekerja secara otomatis:
1. Script `sync_strava.php` (atau `sync_strava.py`) memanggil API Strava Club.
2. Script merangkum jarak (KM) aktivitas lari (`Run`) setiap anggota untuk bulan kalender berjalan.
3. Top 5 pelari teratas otomatis ditulis ke `data/leaderboard.json`.
4. Halaman website [index.html](file:///e:/laragon/www/testing/index.html) membaca file tersebut dan langsung menampilkan data terkini tanpa perlu edit HTML.

---

## 1. Konfigurasi Kredensial Strava

Buka file [strava_config.json](file:///e:/laragon/www/testing/strava_config.json) dan masukkan kredensial akun Strava Anda:

```json
{
  "client_id": "123456",
  "client_secret": "abcdef1234567890...",
  "refresh_token": "9876543210abcdef...",
  "club_id": "1234567"
}
```

### Cara Mendapatkan Kunci Strava API (Gratis):
1. Login ke akun Strava admin klub di browser, lalu buka: **https://www.strava.com/settings/api**.
2. Buat aplikasi baru:
   - **Application Name**: `Gank Kapak Website`
   - **Category**: `Club` atau `Other`
   - **Authorization Callback Domain**: `localhost`
3. Catat **Client ID** dan **Client Secret**.
4. **Club ID**: Buka halaman klub Anda di Strava (`https://www.strava.com/clubs/[CLUB_ID]`). Angka di URL adalah ID klub Anda.
5. **Refresh Token**: Dapatkan refresh token dengan otorisasi scope `read,activity:read_all`.

> **Catatan:** Jika belum diisi, script otomatis berjalan dalam **Mode Simulasi (Mock)** agar website tidak pernah kosong atau error!

---

## 2. Cara Menjalankan Sinkronisasi

Anda bisa memilih salah satu cara termudah berikut:

### Cara 1: Lewat Browser (Sangat Praktis di Laragon)
Cukup buka URL berikut di browser Anda:
```
http://localhost/testing/sync_strava.php
```
Akan muncul dashboard visual bertema gelap dengan log aktivitas dan tabel hasil peringkat lari.

### Cara 2: Lewat Terminal / Command Prompt
Jalankan salah satu perintah:
```bash
# Versi PHP (Bawaan Laragon)
php sync_strava.php

# Versi Python
python sync_strava.py
```

---

## 3. Menjalankan Otomatis (Cron Job / Jadwal Rutin)

Untuk menjalankan sinkronisasi otomatis misalnya **setiap hari jam 23.00**:

### Di Windows (Task Scheduler):
1. Buka **Task Scheduler** di Windows (`Win + R` ketik `taskschd.msc`).
2. Klik **Create Basic Task** -> Beri nama `Sync Strava Gank Kapak`.
3. Trigger: Pilih **Daily** (Harian).
4. Action: **Start a program**:
   - **Program/script**: `C:\laragon\bin\php\php-8.1.10-Win32-vc15-x64\php.exe` (atau path PHP di Laragon Anda)
   - **Add arguments**: `sync_strava.php`
   - **Start in**: `E:\laragon\www\testing`
5. Selesai! Papan KM Anda akan selalu update otomatis setiap hari.
