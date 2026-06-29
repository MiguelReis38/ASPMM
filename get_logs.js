const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');

async function getLogs() {
  const { data, error } = await supabaseAdmin.from('access_logs').select('*');
  console.log("Total Logs:", data ? data.length : "Error: " + JSON.stringify(error));
}
getLogs();
