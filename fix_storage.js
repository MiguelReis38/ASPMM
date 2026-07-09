const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fixStorage() {
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: true,
    allowedMimeTypes: ['image/*']
  });
  console.log('Bucket creation:', error ? error.message : 'OK');
}

fixStorage();
