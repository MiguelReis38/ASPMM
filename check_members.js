const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');

async function checkMembers() {
  const { data, error } = await supabaseAdmin.from('members').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
checkMembers();
