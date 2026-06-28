const fs = require('fs');
const Papa = require('papaparse');

const csv = fs.readFileSync('Banco_Limpo.csv', 'utf8');
const parsed = Papa.parse(csv, { header: true });
const data = parsed.data;

// Find all Titulares
const titulares = data.filter(row => row.Situacao && !row.Situacao.toLowerCase().includes('dependente'));

for (const row of data) {
  // Remove accents from Endereco
  if (row.Endereco) {
    row.Endereco = row.Endereco.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Auto-fill Titular for Dependentes
  if (row.Situacao && row.Situacao.toLowerCase().includes('dependente') && !row.Titular) {
    if (row.Matricula) {
      let baseMatricula = row.Matricula.split('-')[0];
      
      // Find titular with exact base matricula or starts with
      let titular = titulares.find(t => t.Matricula === baseMatricula);
      if (!titular) {
        titular = titulares.find(t => t.Matricula && t.Matricula.startsWith(baseMatricula));
      }
      
      if (titular) {
        row.Titular = titular.Nome;
      }
    }
  }
}

const unparsed = Papa.unparse(data);
fs.writeFileSync('Banco_Limpo.csv', unparsed);
console.log('Fixed Titulares and Enderecos!');
