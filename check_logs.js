const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');

async function checkLogs() {
  const { data, error } = await supabaseAdmin.from('access_logs').select('*').order('created_at', { ascending: false }).limit(10);
  console.log(data);
}
checkLogs();
