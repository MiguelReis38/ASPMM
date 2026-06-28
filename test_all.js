const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_publishable_iGCwoeVOCkERix5-YBu3Mg_28Onn-Se');
async function test() {
  const { data, error } = await supabase.from('members')
    .select('id, full_name, member_code');
  console.log("All members:", data);
}
test();
