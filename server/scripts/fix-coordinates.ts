import { query, run, closeDatabase } from '../src/db';

/**
 * Script om coördinaten te corrigeren: E wordt W (positieve longitude wordt negatief)
 */
async function fixCoordinates() {
  try {
    console.log('🔧 Start corrigeren van coördinaten...\n');

    // Fix log_entries table
    console.log('📝 Corrigeren van log_entries...');
    const logEntriesResult = await run(
      `UPDATE log_entries 
       SET longitude = -longitude 
       WHERE longitude > 0 AND longitude IS NOT NULL`
    );
    console.log(`  ✓ ${logEntriesResult.changes} log entries gecorrigeerd`);

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

