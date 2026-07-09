const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAnnouncements() {
  const { error } = await supabase.from('announcements').select('id').limit(1);
  if (error && error.code === '42P01') { // table does not exist
    console.log('Table announcements does not exist.');
  } else {
    console.log('Table exists. Error:', error);
  }
}

checkAnnouncements();
