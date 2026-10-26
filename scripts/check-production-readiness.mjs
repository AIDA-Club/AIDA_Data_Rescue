import fs from 'node:fs';
import path from 'node:path';

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
      const value = line.trim();
      if (!value || value.startsWith('#')) return [];
      const separator = value.indexOf('=');
      if (separator < 1) return [];
      const key = value.slice(0, separator).trim();
      let content = value.slice(separator + 1).trim();
      if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) content = content.slice(1, -1);
      return [[key, content]];
    }),
  );
}

const fileEnv = loadEnv(path.join(process.cwd(), '.env.local'));
const value = (key) => process.env[key] ?? fileEnv[key] ?? '';
const has = (key) => value(key).trim().length > 0;
const checks = [];
const add = (name, ok, detail) => checks.push({name, ok, detail});

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY']) add(key, has(key), has(key) ? 'configured' : 'missing');
add('AIDA_TEAM_EMAIL_DOMAIN', has('AIDA_TEAM_EMAIL_DOMAIN'), has('AIDA_TEAM_EMAIL_DOMAIN') ? 'configured' : 'missing');
add('OPENAI_API_KEY', has('OPENAI_API_KEY'), has('OPENAI_API_KEY') ? 'configured; live API credits must also be available' : 'missing');
for (const key of ['VERCEL_TOKEN', 'VERCEL_TEAM_ID', 'VERCEL_PROJECT_ID', 'AIDA_SANDBOX_SNAPSHOT']) add(key, has(key), has(key) ? 'configured' : 'missing');

const publicUrl = value('AIDA_PUBLIC_URL');
let publicUrlValid = false;
try {
  const parsed = new URL(publicUrl);
  publicUrlValid = parsed.protocol === 'https:' && parsed.hostname !== 'aida.rescue';
} catch {}
add('AIDA_PUBLIC_URL', publicUrlValid, publicUrlValid ? 'public HTTPS URL configured' : 'missing or local-only');

const localDemoOff = value('AIDA_LOCAL_DEMO').toLowerCase() !== 'true';
add('AIDA_LOCAL_DEMO', localDemoOff, localDemoOff ? 'disabled' : 'must be false or unset for production');

const requiredFiles = [
  'data/participant/equipment_dirty.csv',
  'data/participant/maintenance_outcomes.csv',
  'data/participant/split_manifest.csv',
  'data/private/test_features.csv',
  'data/private/test_labels.csv',
  'supabase/schema.sql',
];
for (const file of requiredFiles) {
  const present = fs.existsSync(path.join(process.cwd(), file));
  add(file, present, present ? 'present' : 'missing');
}

console.log('AIDA Data Rescue — production readiness');
console.log('This report never prints credential values.\n');
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'BLOCK'}  ${check.name}: ${check.detail}`);
const blocked = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - blocked.length}/${checks.length} checks passed.`);
if (blocked.length) {
  console.log('Deployment remains blocked until every BLOCK item is resolved.');
  process.exitCode = 1;
} else {
  console.log('Configuration is present. Run the full rehearsal before publishing.');
}
