const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
const supabase = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_publishable_iGCwoeVOCkERix5-YBu3Mg_28Onn-Se');
const csv = fs.readFileSync('associados_teste_v3.csv', 'utf8');
Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  transformHeader: h => h.trim(),
  complete: async (results) => {
    const data = results.data;
    const dependentes = data.filter(r => (r.Situacao || '').toLowerCase().includes('dependente'));
    
    for (const row of dependentes) {
      let primaryId = null;
      const titularRef = row.Titular;
      if (titularRef) {
        const { data: tData, error: tErr } = await supabase.from('members')
          .select('id')
          .or(`member_code.eq."${titularRef}",full_name.ilike."%${titularRef}%"`)
          .single();
          
        if (tData) {
          primaryId = tData.id;
          console.log(`Linked ${row.Nome} to ${titularRef} (ID: ${primaryId})`);
        } else {
          console.log(`Could not find Titular: ${titularRef} for Dependent: ${row.Nome} (Error: ${tErr ? tErr.message : 'none'})`);
        }
      } else {
        console.log(`No Titular provided for Dependent: ${row.Nome}`);
      }
    }
  }
});
