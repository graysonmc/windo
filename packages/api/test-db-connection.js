// Quick test script to verify Supabase connection
import { db } from './database/supabase.js';

console.log('Testing Supabase connection...\n');

try {
  // Test listing simulations (should return empty array initially)
  const simulations = await db.listSimulations();
  console.log('✅ Database connection successful!');
  console.log(`Found ${simulations.length} simulations in database\n`);

  if (simulations.length > 0) {
    console.log('Existing simulations:');
    simulations.forEach(sim => {
      console.log(`  - ${sim.name} (${sim.id})`);
    });
  } else {
    console.log('Database is empty (ready for use)');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Database connection failed:');
  console.error(error.message);
  console.error('\nTroubleshooting:');
  console.error('1. Check that SUPABASE_URL and SUPABASE_ANON_KEY are in .env');
  console.error('2. Verify the schema.sql has been run in Supabase SQL Editor');
  console.error('3. Confirm the Supabase project is active\n');
  process.exit(1);
}
