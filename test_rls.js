const { createClient } = require('@supabase/supabase-js');
const supabaseAnon = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_publishable_iGCwoeVOCkERix5-YBu3Mg_28Onn-Se');

async function testAnonInsert() {
  const { error } = await supabaseAnon.from('access_logs').insert({
    member_id: '74c51d65-c45e-42c8-9241-9b21636c7728',
    status: 'granted',
    reason: 'RLS Test'
  });
  console.log("Anon Insert Error:", error);
}
testAnonInsert();
