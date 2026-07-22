const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const csv = fs.readFileSync('Banco_Limpo.csv', 'utf8');
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');

  let updated = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let cur = '';
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') inQ = !inQ;
      else if (line[j] === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
      else cur += line[j];
    }
    row.push(cur.trim());

    const nome = row[1];
    let dataNasc = row[7];

    if (dataNasc === '1990-01-01' || !dataNasc || dataNasc.trim() === '') {
      dataNasc = null;
    }

    if (nome && dataNasc) {
      const { error } = await supabase
        .from('members')
        .update({ birth_date: dataNasc })
        .eq('full_name', nome);
      
      if (error) {
        console.error('Error updating', nome, error.message);
      } else {
        updated++;
      }
    }
    if (i % 100 === 0) console.log(`Processed ${i} of ${lines.length}`);
  }
  console.log(`Finished! Updated ${updated} birth dates!`);
}
run();
