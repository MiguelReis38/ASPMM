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

async function fixDates() {
  const { data, error } = await supabase
    .from('members')
    .update({ birth_date: null })
    .eq('birth_date', '1990-01-01');

  if (error) {
    console.error('Error updating dates:', error);
  } else {
    console.log('Success! Removed fake birth dates for these users.');
  }
}

fixDates();
