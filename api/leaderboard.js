/**
 * Vercel Serverless Function — Strava Club Leaderboard
 * Auto-syncs top runners for current month with Edge Caching & Fallback
 */

const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Baca data fallback dari data/leaderboard.json jika ada
  let fallbackData = [];
  try {
    const dataPath = path.join(process.cwd(), 'data', 'leaderboard.json');
    if (fs.existsSync(dataPath)) {
      fallbackData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (_) {
    fallbackData = [
      { rank: '01', name: 'Anisa (Mba-mba Ultra)', distance: '168.0 KM' },
      { rank: '02', name: 'Ega (Dieng)', distance: '136.5 KM' },
      { rank: '03', name: 'Surya', distance: '116.2 KM' },
      { rank: '04', name: 'Fajar', distance: '103.0 KM' },
      { rank: '05', name: 'Gusti', distance: '84.0 KM' }
    ];
  }

  // 2. Ambil kredensial dari Environment Variables (Vercel) atau file lokal
  let clientId = (process.env.STRAVA_CLIENT_ID || '').trim();
  let clientSecret = (process.env.STRAVA_CLIENT_SECRET || '').trim();
  let refreshToken = (process.env.STRAVA_REFRESH_TOKEN || '').trim();
  let clubId = (process.env.STRAVA_CLUB_ID || '').trim();

  // Fallback ke strava_config.json untuk pengetesan lokal jika ENV belum diisi
  if (!clientId || !clientSecret || !refreshToken || !clubId) {
    try {
      const configPath = path.join(process.cwd(), 'strava_config.json');
      if (fs.existsSync(configPath)) {
        const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        clientId = clientId || (localConfig.client_id || '').trim();
        clientSecret = clientSecret || (localConfig.client_secret || '').trim();
        refreshToken = refreshToken || (localConfig.refresh_token || '').trim();
        clubId = clubId || (localConfig.club_id || '').trim();
      }
    } catch (_) {}
  }

  // Cek apakah kredensial valid (bukan placeholder dummy)
  const isDummy =
    !clientId ||
    !clientSecret ||
    !refreshToken ||
    !clubId ||
    clientId.includes('MASUKKAN') ||
    clubId.includes('MASUKKAN');

  if (isDummy) {
    // Mode simulasi/fallback jika kredensial belum diisi di Vercel Dashboard
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Data-Source', 'mock-fallback');
    return res.status(200).json(fallbackData);
  }

  try {
    // 3. Step A: Refresh Access Token Strava
    const tokenUrl = 'https://www.strava.com/oauth/token';
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    if (!tokenRes.ok) {
      console.warn('Gagal refresh token Strava, HTTP:', tokenRes.status);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      res.setHeader('X-Data-Source', 'fallback-auth-error');
      return res.status(200).json(fallbackData);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      res.setHeader('X-Data-Source', 'fallback-no-token');
      return res.status(200).json(fallbackData);
    }

    // 4. Step B: Ambil aktivitas club dari Strava API
    const activitiesUrl = `https://www.strava.com/api/v3/clubs/${encodeURIComponent(clubId)}/activities?page=1&per_page=100`;
    const activitiesRes = await fetch(activitiesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!activitiesRes.ok) {
      console.warn('Gagal ambil aktivitas Strava, HTTP:', activitiesRes.status);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      res.setHeader('X-Data-Source', 'fallback-activities-error');
      return res.status(200).json(fallbackData);
    }

    const activities = await activitiesRes.json();
    if (!Array.isArray(activities)) {
      return res.status(200).json(fallbackData);
    }

    // 5. Step C: Hitung total KM lari atlet untuk bulan berjalan
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totals = {};

    for (const act of activities) {
      // Hanya jenis olahraga 'Run'
      if (act.type !== 'Run') continue;

      const startDate = act.start_date || '';
      if (!startDate.startsWith(currentYM)) continue;

      const athlete = act.athlete || {};
      const firstName = (athlete.firstname || '').trim();
      const lastName = (athlete.lastname || '').trim();
      const athleteName = `${firstName} ${lastName}`.trim() || 'Pelari Gank Kapak';

      const distMeters = Number(act.distance) || 0;
      const distKm = distMeters / 1000.0;

      totals[athleteName] = (totals[athleteName] || 0) + distKm;
    }

    const sortedAthletes = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Jika belum ada lari di bulan ini, gunakan fallback agar tabel tidak kosong
    if (sortedAthletes.length === 0) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
      res.setHeader('X-Data-Source', 'fallback-no-runs-this-month');
      return res.status(200).json(fallbackData);
    }

    const leaderboard = sortedAthletes.map(([name, km], idx) => ({
      rank: String(idx + 1).padStart(2, '0'),
      name: name,
      distance: `${km.toFixed(1)} KM`
    }));

    // Cache di Vercel Edge CDN selama 30 menit (1800s) agar tidak boros kuota rate limit Strava
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    res.setHeader('X-Data-Source', 'strava-api');
    return res.status(200).json(leaderboard);

  } catch (err) {
    console.error('Error saat menghubungi Strava API:', err);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.setHeader('X-Data-Source', 'fallback-exception');
    return res.status(200).json(fallbackData);
  }
};
