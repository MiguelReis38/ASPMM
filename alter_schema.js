const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: "ALTER TABLE members ALTER COLUMN birth_date DROP NOT NULL;"
  });
  if (error) {
    console.error('Error with RPC, trying direct fallback...', error);
  } else {
    console.log('Successfully dropped NOT NULL constraint.');
  }
}

run();
