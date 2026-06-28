const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_publishable_iGCwoeVOCkERix5-YBu3Mg_28Onn-Se');
async function test() {
  const { data, error } = await supabase.from('members')
    .select('id, full_name, member_code')
    .or(`member_code.eq."FABIANA C. ROMAN C. SOARES",full_name.ilike."%FABIANA C. ROMAN C. SOARES%"`);
  console.log(data);
}
test();
