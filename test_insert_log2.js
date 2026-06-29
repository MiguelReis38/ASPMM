const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');

async function checkSchema() {
  const { data, error } = await supabaseAdmin.from('access_logs').insert({
    member_id: '74c51d65-c45e-42c8-9241-9b21636c7728',
    scanned_by: null,
    status: 'granted',
    reason: 'Test 2'
  });
  console.log(error);
}
checkSchema();
