#!/usr/bin/env python3
"""
GANK KAPAK — STRAVA LEADERBOARD SYNC (OPSI A: PYTHON)
Sinkronisasi otomatis aktivitas klub Strava ke data/leaderboard.json
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'strava_config.json')
OUTPUT_FILE = os.path.join(BASE_DIR, 'data', 'leaderboard.json')

os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)

def log(msg, level="INFO"):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{now} [{level}] {msg}")

def run_sync():
    client_id = os.environ.get('STRAVA_CLIENT_ID', '').strip()
    client_secret = os.environ.get('STRAVA_CLIENT_SECRET', '').strip()
    refresh_token = os.environ.get('STRAVA_REFRESH_TOKEN', '').strip()
    club_id = os.environ.get('STRAVA_CLUB_ID', '').strip()

    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            client_id = client_id or str(config.get('client_id', '')).strip()
            client_secret = client_secret or str(config.get('client_secret', '')).strip()
            refresh_token = refresh_token or str(config.get('refresh_token', '')).strip()
            club_id = club_id or str(config.get('club_id', '')).strip()
        except Exception:
            pass

    is_mock = '--mock' in sys.argv or 'MASUKKAN' in client_id or not client_id or not club_id

    if is_mock:
        log("Kredensial Strava belum lengkap di strava_config.json.", "WARNING")
        log("Menjalankan mode simulasi (mock) agar data tetap ter-update...", "INFO")
        mock_data = [
            {"rank": "01", "name": "Anisa (Mba-mba Ultra)", "distance": "168.0 KM"},
            {"rank": "02", "name": "Ega (Dieng)", "distance": "136.5 KM"},
            {"rank": "03", "name": "Surya", "distance": "116.2 KM"},
            {"rank": "04", "name": "Fajar", "distance": "103.0 KM"},
            {"rank": "05", "name": "Gusti", "distance": "84.0 KM"},
        ]
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(mock_data, f, indent=4, ensure_ascii=False)
        log("Berhasil memperbarui data/leaderboard.json (mode simulasi).", "SUCCESS")
        return

    # 1. Refresh Access Token
    log("Mengambil token akses baru dari Strava API...", "INFO")
    token_url = "https://www.strava.com/oauth/token"
    token_payload = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }).encode('utf-8')

    req = urllib.request.Request(token_url, data=token_payload, method="POST")
    with urllib.request.urlopen(req) as resp:
        token_res = json.loads(resp.read().decode('utf-8'))

    access_token = token_res.get('access_token')
    new_refresh = token_res.get('refresh_token')

    if new_refresh and new_refresh != refresh_token:
        config['refresh_token'] = new_refresh
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        log("Refresh token baru disimpan ke strava_config.json.", "INFO")

    # 2. Get Club Activities
    log("Mengambil aktivitas lari klub...", "INFO")
    activities_url = f"https://www.strava.com/api/v3/clubs/{club_id}/activities?page=1&per_page=100"
    act_req = urllib.request.Request(activities_url, headers={
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json"
    })

    with urllib.request.urlopen(act_req) as resp:
        activities = json.loads(resp.read().decode('utf-8'))

    current_ym = datetime.now().strftime("%Y-%m")
    totals = {}

    for act in activities:
        if act.get('type') != 'Run':
            continue
        start_date = act.get('start_date', '')
        if not start_date.startswith(current_ym):
            continue

        athlete = act.get('athlete', {})
        first = athlete.get('firstname', '').strip()
        last = athlete.get('lastname', '').strip()
        name = f"{first} {last}".strip() or "Pelari Gank Kapak"
        dist_km = float(act.get('distance', 0)) / 1000.0

        totals[name] = totals.get(name, 0.0) + dist_km

    sorted_athletes = sorted(totals.items(), key=lambda x: x[1], reverse=True)[:5]
    leaderboard = []
    for i, (name, km) in enumerate(sorted_athletes, 1):
        leaderboard.append({
            "rank": f"{i:02d}",
            "name": name,
            "distance": f"{km:.1f} KM"
        })

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(leaderboard, f, indent=4, ensure_ascii=False)

    log(f"Berhasil memperbarui data/leaderboard.json dengan {len(leaderboard)} pelari teratas.", "SUCCESS")

if __name__ == '__main__':
    run_sync()
