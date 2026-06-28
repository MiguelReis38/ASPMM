const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
const supabase = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');
async function test() {
  const { data, error } = await supabase.from('members').select('*');
  console.log("Count:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log(data[0]);
  }
}
test();
