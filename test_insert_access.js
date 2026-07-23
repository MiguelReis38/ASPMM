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
  const { data, error } = await supabase.from('access_logs').insert({ 
        member_id: '74c51d65-c45e-42c8-9241-9b21636c7728', 
        status: 'success',
        reason: 'LIBERADO'
  }).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
