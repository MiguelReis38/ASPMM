const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');

async function getPolicies() {
  const { data, error } = await supabaseAdmin.rpc('get_policies', { table_name: 'access_logs' });
  if (error) {
     // fallback if no rpc
     const { data: dbData, error: dbError } = await supabaseAdmin.from('access_logs').select('*').limit(1);
     console.log("No RPC. Just queried:", dbError);
  } else {
     console.log(data);
  }
}
getPolicies();
