const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('members').select('full_name, birth_date').limit(10);
  console.log("Random 10 members:", data);

  const { data: d2 } = await supabase.from('members').select('full_name, birth_date').eq('full_name', 'ELISANGELA VILASBOAS CRUVINEL');
  console.log("Elisangela:", d2);
  
  const { data: d3 } = await supabase.from('members').select('full_name, birth_date').eq('full_name', 'WALTER LUIS DOS SANTOS');
  console.log("Walter:", d3);
}
check();
