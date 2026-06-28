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
    for (const row of data) {
      if (row.Situacao && row.Situacao.toLowerCase().includes('dependente')) continue;
      const payload = {
          member_code: Math.floor(100000 + Math.random() * 900000).toString(),
          full_name: row.Nome,
          cpf: row.CPF ? String(row.CPF).trim() : Math.floor(10000000000 + Math.random() * 90000000000).toString(),
          status: 'active',
          category: row.Situacao || 'Titular',
          is_dependent: false,
          workplace: row.Orgao || 'Não informado',
          birth_date: row.DataNascimento || '1990-01-01',
          address: row.Endereco || '',
          phone: row.Telefone || '',
          validity_date: row.DataValidade || null,
          card_number: row.Carterinha || '',
          matricula: row.Matricula || null,
          created_at: row.DataCriacao || undefined,
          role: 'member'
      };
      const { error } = await supabase.from('members').insert(payload);
      if (error) {
        console.error('Error inserting:', payload.full_name, error);
      } else {
        console.log('Inserted:', payload.full_name);
      }
    }
  }
});
