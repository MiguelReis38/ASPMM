const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');
const supabaseAnon = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_publishable_iGCwoeVOCkERix5-YBu3Mg_28Onn-Se');

async function testAuthInsert() {
  const { data: authData } = await supabaseAnon.auth.signInWithPassword({
    email: 'miguel.alipio2008@gmail.com',
    password: '3501aliehA'
  });
  
  if (authData.session) {
     const { error } = await supabaseAnon.from('access_logs').insert({
       member_id: '74c51d65-c45e-42c8-9241-9b21636c7728',
       scanned_by: authData.session.user.id,
       status: 'granted',
       reason: 'Auth Test'
     });
     console.log("Insert Error with Auth:", error);
  } else {
     console.log("Could not login");
  }
}
testAuthInsert();
