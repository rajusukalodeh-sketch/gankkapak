<?php
/**
 * ==============================================================================
 * GANK KAPAK — STRAVA LEADERBOARD SYNC SCRIPT (OPSI A)
 * ==============================================================================
 * Script ini bertugas menarik data aktivitas lari dari Strava Club API,
 * menghitung total kilometer setiap anggota pada bulan berjalan, lalu
 * menyimpan peringkat Top 5 ke file: data/leaderboard.json
 *
 * Cara Menjalankan:
 * 1. Lewat Browser (Laragon): http://localhost/testing/sync_strava.php
 * 2. Lewat Terminal / CLI   : php sync_strava.php
 * 3. Otomatis via Cron/Task : Jadwalkan php sync_strava.php setiap hari/minggu
 * ==============================================================================
 */

header('Content-Type: text/html; charset=utf-8');

$isCli = (php_sapi_name() === 'cli');
$configFile = __DIR__ . '/strava_config.json';
$outputFile = __DIR__ . '/data/leaderboard.json';

// Pastikan direktori data/ ada
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

function logMessage($msg, $type = 'info') {
    global $isCli;
    $time = date('Y-m-d H:i:s');
    if ($isCli) {
        $prefix = match ($type) {
            'error'   => "[ERROR]",
            'success' => "[SUCCESS]",
            'warning' => "[WARNING]",
            default   => "[INFO]",
        };
        echo "{$time} {$prefix} {$msg}\n";
    } else {
        $badgeClass = match ($type) {
            'error'   => 'color: #ff6b6b;',
            'success' => 'color: #1F9D55;',
            'warning' => 'color: #f59f00;',
            default   => 'color: #8ce99a;',
        };
        echo "<div style='font-family: monospace; margin: 4px 0; font-size: 13px;'>";
        echo "<span style='color: #666;'>[{$time}]</span> <span style='{$badgeClass} font-weight: bold;'>{$msg}</span>";
        echo "</div>";
    }
}

// -----------------------------------------------------------------------------
// 1. BACA KONFIGURASI STRAVA
// -----------------------------------------------------------------------------
$config = [];
if (file_exists($configFile)) {
    $config = json_decode(file_get_contents($configFile), true) ?: [];
}

$clientId     = trim(getenv('STRAVA_CLIENT_ID') ?: ($config['client_id'] ?? ''));
$clientSecret = trim(getenv('STRAVA_CLIENT_SECRET') ?: ($config['client_secret'] ?? ''));
$refreshToken = trim(getenv('STRAVA_REFRESH_TOKEN') ?: ($config['refresh_token'] ?? ''));
$clubId       = trim(getenv('STRAVA_CLUB_ID') ?: ($config['club_id'] ?? ''));

$isMock = isset($_GET['mock']) || (isset($argv[1]) && $argv[1] === '--mock');

// Render Header Web jika dijalankan di browser
if (!$isCli) {
    echo <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Gank Kapak — Strava Leaderboard Sync</title>
    <style>
        body { background: #0A0F0B; color: #EAF4EC; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px 20px; line-height: 1.6; }
        .box { max-width: 680px; margin: 0 auto; background: #131A14; border: 1px solid #1F9D55; border-radius: 8px; padding: 24px; }
        h1 { font-size: 20px; margin-top: 0; color: #1F9D55; text-transform: uppercase; letter-spacing: 0.05em; }
        .btn { display: inline-block; background: #1F9D55; color: #0A0F0B; font-weight: bold; padding: 8px 16px; border-radius: 4px; text-decoration: none; margin-top: 12px; }
        .log-area { background: #0A0F0B; border: 1px solid #222; border-radius: 4px; padding: 12px; margin: 16px 0; max-height: 300px; overflow-y: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #222; }
        th { color: #888; font-size: 12px; text-transform: uppercase; }
    </style>
</head>
<body>
<div class="box">
    <h1>Sync Papan KM Strava — Gank Kapak</h1>
    <p style="color: #aaa; font-size: 14px;">Sinkronisasi otomatis aktivitas klub Strava ke data/leaderboard.json</p>
    <div class="log-area">
HTML;
}

// -----------------------------------------------------------------------------
// 2. CEK APAKAH CREDENTIALS MASIH DUMMY
// -----------------------------------------------------------------------------
if (!$isMock && (str_contains($clientId, 'MASUKKAN') || empty($clientId) || empty($clientSecret) || empty($refreshToken) || empty($clubId))) {
    logMessage("Kredensial Strava belum dikonfigurasi di strava_config.json.", 'warning');
    logMessage("Panduan cepat mendapatkan kunci Strava API:", 'info');
    logMessage("1. Buka https://www.strava.com/settings/api lalu buat aplikasi gratis.", 'info');
    logMessage("2. Catat Client ID & Client Secret.", 'info');
    logMessage("3. Dapatkan Refresh Token admin klub Strava.", 'info');
    logMessage("4. Isi data tersebut ke file 'strava_config.json'.", 'info');
    logMessage("--- Menjalankan MODE SIMULASI (MOCK SYNC) agar data tetap ter-update ---", 'warning');
    $isMock = true;
}

// -----------------------------------------------------------------------------
// 3. PROSES DATA (MOCK ATAU REAL STRAVA API)
// -----------------------------------------------------------------------------
$leaderboard = [];

if ($isMock) {
    // Mode Simulasi / Demo Data
    logMessage("Menghasilkan data simulasi bulan " . date('F Y') . "...", 'info');
    $mockAthletes = [
        ['name' => 'Anisa (Mba-mba Ultra)', 'base' => 165],
        ['name' => 'Ega (Dieng)', 'base' => 135],
        ['name' => 'Surya ', 'base' => 118],
        ['name' => 'Fajar', 'base' => 102],
        ['name' => 'Iqbal', 'base' => 74],
        ['name' => 'Gusti', 'base' => 62],
        ['name' => 'Faisal', 'base' => 55],
    ];

    // Tambahkan variasi jarak realistis
    foreach ($mockAthletes as &$athlete) {
        $variance = rand(-30, 30) / 10;
        $athlete['total_km'] = round($athlete['base'] + $variance, 1);
    }
    unset($athlete);

    usort($mockAthletes, fn($a, $b) => $b['total_km'] <=> $a['total_km']);
    $top5 = array_slice($mockAthletes, 0, 5);

    foreach ($top5 as $i => $item) {
        $rank = str_pad($i + 1, 2, '0', STR_PAD_LEFT);
        $leaderboard[] = [
            'rank'     => $rank,
            'name'     => $item['name'],
            'distance' => number_format($item['total_km'], 1, '.', '') . ' KM',
        ];
    }

    logMessage("Data simulasi 5 pelari teratas berhasil diproses.", 'success');

} else {
    // -------------------------------------------------------------------------
    // REAL STRAVA API CALL
    // -------------------------------------------------------------------------
    logMessage("Menghubungi Strava OAuth token endpoint...", 'info');

    // Step A: Refresh Access Token
    $ch = curl_init('https://www.strava.com/oauth/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'grant_type'    => 'refresh_token',
        'refresh_token' => $refreshToken,
    ]));
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $tokenResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$tokenResponse) {
        logMessage("Gagal mendapatkan Access Token dari Strava. HTTP Code: {$httpCode}", 'error');
        exit(1);
    }

    $tokenData = json_decode($tokenResponse, true);
    $accessToken = $tokenData['access_token'] ?? null;
    $newRefreshToken = $tokenData['refresh_token'] ?? null;

    if (!$accessToken) {
        logMessage("Access token tidak valid di respon Strava.", 'error');
        exit(1);
    }

    // Perbarui refresh token jika ada pergantian dari Strava
    if ($newRefreshToken && $newRefreshToken !== $refreshToken) {
        $config['refresh_token'] = $newRefreshToken;
        file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        logMessage("Refresh token baru disimpan ke strava_config.json.", 'info');
    }

    logMessage("Access Token berhasil diperoleh. Mengambil aktivitas klub...", 'info');

    // Step B: Ambil Aktivitas Klub
    $activitiesUrl = "https://www.strava.com/api/v3/clubs/{$clubId}/activities?page=1&per_page=100";
    $ch = curl_init($activitiesUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer {$accessToken}",
        "Accept: application/json",
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    $activitiesResponse = curl_exec($ch);
    $actCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($actCode !== 200 || !$activitiesResponse) {
        logMessage("Gagal mengambil aktivitas klub. HTTP Code: {$actCode}", 'error');
        exit(1);
    }

    $activities = json_decode($activitiesResponse, true);
    if (!is_array($activities)) {
        logMessage("Format respon aktivitas Strava tidak valid.", 'error');
        exit(1);
    }

    logMessage("Ditemukan " . count($activities) . " total aktivitas terbaru dari klub.", 'info');

    // Step C: Hitung Total Kilometer Per Atlet Bulan Ini
    $currentYearMonth = date('Y-m');
    $athleteTotals = [];

    foreach ($activities as $act) {
        // Hanya hitung aktivitas lari ("Run")
        if (($act['type'] ?? '') !== 'Run') {
            continue;
        }

        // Cek apakah aktivitas dilakukan di bulan kalender saat ini
        $actDate = $act['start_date'] ?? '';
        if (substr($actDate, 0, 7) !== $currentYearMonth) {
            continue;
        }

        $athlete = $act['athlete'] ?? [];
        $firstName = trim($athlete['firstname'] ?? '');
        $lastName = trim($athlete['lastname'] ?? '');
        $athleteName = trim("{$firstName} {$lastName}");

        if (empty($athleteName)) {
            $athleteName = 'Pelari Gank Kapak';
        }

        $distMeters = floatval($act['distance'] ?? 0);
        $distKm = $distMeters / 1000.0;

        if (!isset($athleteTotals[$athleteName])) {
            $athleteTotals[$athleteName] = 0.0;
        }
        $athleteTotals[$athleteName] += $distKm;
    }

    arsort($athleteTotals);
    $top5 = array_slice($athleteTotals, 0, 5, true);

    $rankIdx = 1;
    foreach ($top5 as $name => $km) {
        $rankStr = str_pad($rankIdx, 2, '0', STR_PAD_LEFT);
        $leaderboard[] = [
            'rank'     => $rankStr,
            'name'     => $name,
            'distance' => number_format($km, 1, '.', '') . ' KM',
        ];
        $rankIdx++;
    }

    logMessage("Berhasil merangkum " . count($leaderboard) . " pelari teratas bulan ini.", 'success');
}

// -----------------------------------------------------------------------------
// 4. SIMPAN DATA KE DATA/LEADERBOARD.JSON
// -----------------------------------------------------------------------------
if (!empty($leaderboard)) {
    $jsonContent = json_encode($leaderboard, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    file_put_contents($outputFile, $jsonContent);
    logMessage("Papan km berhasil disimpan ke: data/leaderboard.json", 'success');
} else {
    logMessage("Tidak ada data lari yang dapat disimpan.", 'warning');
}

// -----------------------------------------------------------------------------
// 5. OUTPUT AKHIR (WEB DASHBOARD)
// -----------------------------------------------------------------------------
if (!$isCli) {
    echo "</div>"; // end log-area

    echo "<h2 style='font-size: 16px; margin-top: 20px; color: #EAF4EC;'>Hasil Peringkat Terkini (data/leaderboard.json):</h2>";
    echo "<table>";
    echo "<thead><tr><th>Rank</th><th>Nama Pelari</th><th>Total Jarak</th></tr></thead>";
    echo "<tbody>";
    foreach ($leaderboard as $row) {
        echo "<tr>";
        echo "<td style='font-family: monospace; font-weight: bold; color: #1F9D55;'>{$row['rank']}</td>";
        echo "<td>{$row['name']}</td>";
        echo "<td style='font-family: monospace; font-weight: bold;'>{$row['distance']}</td>";
        echo "</tr>";
    }
    echo "</tbody></table>";

    echo "<div style='margin-top: 24px; display: flex; gap: 12px; align-items: center;'>";
    echo "<a href='sync_strava.php' class='btn'>Sync Ulang Sekarang</a>";
    echo "<a href='index.html#leaderboard' class='btn' style='background: #333; color: #fff;'>Buka Website Utama</a>";
    echo "</div>";

    echo "</div></body></html>";
}
