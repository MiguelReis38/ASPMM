const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function syncDates() {
  const content = fs.readFileSync('Banco_Limpo.csv', 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

  let updated = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowArray = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { rowArray.push(current.trim()); current = ''; }
      else { current += char; }
    }
    rowArray.push(current.trim());
    
    const nome = rowArray[1];
    let dataNasc = rowArray[7];
    
    if (dataNasc === '1990-01-01' || !dataNasc || dataNasc.trim() === '') {
      dataNasc = null;
    }

    if (nome) {
      const { error } = await supabase.from('members')
        .update({ birth_date: dataNasc })
        .eq('full_name', nome);
        
      if (!error) updated++;
      if (i % 50 === 0) console.log(`Processed ${i} / ${lines.length}`);
    }
  }
  console.log(`Finished! Updated ${updated} records.`);
}

syncDates();
