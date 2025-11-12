stauimport { query, run, closeDatabase } from '../src/db';

/**
 * Script om coördinaten te corrigeren: E wordt W (positieve longitude wordt negatief)
 */
async function fixCoordinates() {
  try {
    console.log('🔧 Start corrigeren van coördinaten...\n');

    console.log('📝 Corrigeren van log_entries (sign + anomaly fixes)...');
    // First flip sign for positive longitudes (E->W correction)
    const logFlipResult = await run(
      `UPDATE log_entries 
       SET longitude = -longitude 
       WHERE longitude > 0 AND longitude IS NOT NULL`
    );
    console.log(`  ✓ ${logFlipResult.changes} log entries sign-corrected`);

    // Now fetch ordered log entries per voyage to detect and fix anomalies
    const rows = await query<{
      id: number;
      voyage_id: number | null;
      date: string;
      longitude: number | null;
      latitude: number | null;
    }>(
      `SELECT id, voyage_id, date, longitude, latitude FROM log_entries WHERE longitude IS NOT NULL OR latitude IS NOT NULL ORDER BY voyage_id, date`
    );

    // Group by voyage_id (nulls kept together)
    const groups: Record<string, typeof rows> = {};
    for (const r of rows) {
      const key = String(r.voyage_id ?? 'null');
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    let correctedLonCount = 0;
    let correctedLatCount = 0;
    for (const key of Object.keys(groups)) {
      const list = groups[key];
      for (let i = 1; i < list.length - 1; i++) {
        const prev = list[i - 1];
        const mid = list[i];
        const next = list[i + 1];
        // --- Longitude anomaly detection and fixes ---
        if (prev.longitude != null && mid.longitude != null && next.longitude != null) {
          // Work in absolute degrees but preserve sign (W negative)
          const prevAbs = Math.abs(prev.longitude);
          const midAbs = Math.abs(mid.longitude);
          const nextAbs = Math.abs(next.longitude);

          const neighborAvg = (prevAbs + nextAbs) / 2;

          // Candidate 1: middle lost a leading '1' (e.g., 74.54 should be 174.54)
          // Try midAbs + 100 and accept if it's closer to neighbors
          const midPlus100 = midAbs + 100;
          const distOriginal = Math.abs(midAbs - neighborAvg);
          const distPlus100 = Math.abs(midPlus100 - neighborAvg);

          if (distPlus100 + 1e-6 < distOriginal && midAbs < 100 && neighborAvg >= 160) {
            // apply correction: restore leading 1
            const corrected = (midPlus100) * (mid.longitude < 0 ? -1 : 1);
            await run('UPDATE log_entries SET longitude = ? WHERE id = ?', [corrected, mid.id]);
            correctedLonCount++;
            console.log(`    → Corrected leading-1 at id=${mid.id}: ${mid.longitude} -> ${corrected}`);
            // continue to next triplet after fixing longitude
            continue;
          }

          // Candidate 1b: middle has a false leading '7' (e.g., 74 -> 14).
          // Try midAbs - 60 and accept if it's closer to neighbors (typical misread of 1->7).
          const midMinus60 = midAbs - 60;
          const distMinus60 = Math.abs(midMinus60 - neighborAvg);
          if (midAbs >= 60 && midAbs < 100 && neighborAvg >= 5 && neighborAvg <= 30 && distMinus60 + 1e-6 < distOriginal) {
            const corrected = (midMinus60) * (mid.longitude < 0 ? -1 : 1);
            await run('UPDATE log_entries SET longitude = ? WHERE id = ?', [corrected, mid.id]);
            correctedLonCount++;
            console.log(`    → Corrected false-7 at id=${mid.id}: ${mid.longitude} -> ${corrected}`);
            continue;
          }

          // Candidate 2: middle is an outlier (e.g., 180/170/180 alternation or small-angle spike)
          // If neighbors are close to each other but middle deviates a lot, replace with average
          const neighborsClose = Math.abs(prevAbs - nextAbs) <= 5; // neighbors within 5°
          const midDeviation = Math.abs(midAbs - neighborAvg);
          if (neighborsClose && midDeviation > 5) {
            // set mid to neighbors average
            const avg = neighborAvg;
            const corrected = avg * (prev.longitude < 0 ? -1 : 1); // use sign of neighbors (assume same)
            await run('UPDATE log_entries SET longitude = ? WHERE id = ?', [corrected, mid.id]);
            correctedLonCount++;
            console.log(`    → Smoothed longitude outlier at id=${mid.id}: ${mid.longitude} -> ${corrected}`);
            // continue to next triplet after fixing longitude
            continue;
          }
        }

        // --- Latitude anomaly detection and fixes (north/south) ---
        if (prev.latitude != null && mid.latitude != null && next.latitude != null) {
          const prevLatAbs = Math.abs(prev.latitude);
          const midLatAbs = Math.abs(mid.latitude);
          const nextLatAbs = Math.abs(next.latitude);
          const neighborLatAvg = (prevLatAbs + nextLatAbs) / 2;

          // Immediate rule: if a latitude is clearly misread as >70° North (e.g., 74 -> 14),
          // correct it by subtracting 60 without consulting neighbors.
          if (mid.latitude > 70) {
            const correctedLat = mid.latitude - 60;
            await run('UPDATE log_entries SET latitude = ? WHERE id = ?', [correctedLat, mid.id]);
            correctedLatCount++;
            console.log(`    → Forced false-7 N at id=${mid.id}: ${mid.latitude} -> ${correctedLat}`);
            continue;
          }

          // Hemisphere-flip detection: if middle has opposite sign from neighbors but neighbors agree on sign,
          // flip middle's sign to match neighbors (e.g., 40S, 40N, -30S -> correct middle to -40S).
          const prevSign = Math.sign(prev.latitude);
          const midSign = Math.sign(mid.latitude);
          const nextSign = Math.sign(next.latitude);
          if (prevSign === nextSign && prevSign !== midSign && prevSign !== 0) {
            // neighbors have the same sign but middle differs -> flip middle's sign
            const correctedLat = -mid.latitude;
            await run('UPDATE log_entries SET latitude = ? WHERE id = ?', [correctedLat, mid.id]);
            correctedLatCount++;
            console.log(`    → Corrected hemisphere flip at id=${mid.id}: ${mid.latitude} -> ${correctedLat}`);
            continue;
          }

          // For latitude we don't add 100; we only smooth outliers where neighbors agree
          const neighborsLatClose = Math.abs(prevLatAbs - nextLatAbs) <= 5; // within 5°
          const midLatDeviation = Math.abs(midLatAbs - neighborLatAvg);
          // Candidate: false leading 7 -> 1 for latitude (e.g., 74 -> 14) when neighbors suggest 5-30°
          const midLatMinus60 = midLatAbs - 60;
          const distLatOriginal = Math.abs(midLatAbs - neighborLatAvg);
          const distLatMinus60 = Math.abs(midLatMinus60 - neighborLatAvg);
          if (midLatAbs >= 60 && midLatAbs < 100 && neighborLatAvg >= 5 && neighborLatAvg <= 30 && distLatMinus60 + 1e-6 < distLatOriginal) {
            const correctedLat = midLatMinus60 * (mid.latitude < 0 ? -1 : 1);
            await run('UPDATE log_entries SET latitude = ? WHERE id = ?', [correctedLat, mid.id]);
            correctedLatCount++;
            console.log(`    → Corrected false-7 latitude at id=${mid.id}: ${mid.latitude} -> ${correctedLat}`);
            continue;
          }
          if (neighborsLatClose && midLatDeviation > 5) {
            const avgLat = neighborLatAvg;
            const correctedLat = avgLat * (prev.latitude < 0 ? -1 : 1); // preserve N/S sign
            await run('UPDATE log_entries SET latitude = ? WHERE id = ?', [correctedLat, mid.id]);
            correctedLatCount++;
            console.log(`    → Smoothed latitude outlier at id=${mid.id}: ${mid.latitude} -> ${correctedLat}`);
            continue;
          }
        }
      }
    }

    console.log(`  ✓ ${correctedLonCount} log entries longitude anomaly-corrected`);
    console.log(`  ✓ ${correctedLatCount} log entries latitude anomaly-corrected`);

    // Fix whale_sightings table
    console.log('\n🐋 Corrigeren van whale_sightings...');
    const whaleSightingsResult = await run(
      `UPDATE whale_sightings 
       SET longitude = -longitude 
       WHERE longitude > 0 AND longitude IS NOT NULL`
    );
    console.log(`  ✓ ${whaleSightingsResult.changes} whale sightings gecorrigeerd`);

    // Show summary
    console.log('\n📊 Samenvatting:');
    const logStats = await query<{ count: number; avg_lon: number }>(
      `SELECT COUNT(*) as count, AVG(longitude) as avg_lon 
       FROM log_entries 
       WHERE longitude IS NOT NULL`
    );
    const whaleStats = await query<{ count: number; avg_lon: number }>(
      `SELECT COUNT(*) as count, AVG(longitude) as avg_lon 
       FROM whale_sightings 
       WHERE longitude IS NOT NULL`
    );

    console.log(`  Log entries met coördinaten: ${logStats[0]?.count || 0}`);
    console.log(`  Gemiddelde longitude (log entries): ${logStats[0]?.avg_lon?.toFixed(2) || 'N/A'}`);
    console.log(`  Whale sightings met coördinaten: ${whaleStats[0]?.count || 0}`);
    console.log(`  Gemiddelde longitude (whale sightings): ${whaleStats[0]?.avg_lon?.toFixed(2) || 'N/A'}`);

    console.log('\n✅ Correctie voltooid!');
  } catch (error) {
    console.error('❌ Fout bij corrigeren:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run the script
if (require.main === module) {
  fixCoordinates()
    .then(() => {
      console.log('\n✨ Script succesvol afgerond');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script mislukt:', error);
      process.exit(1);
    });
}

export { fixCoordinates };

