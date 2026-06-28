const fs = require('fs');

const content = fs.readFileSync('Banco_ASPMM_Organizado(in).csv', 'utf8');
const lines = content.split(/\r?\n/);

const headers = 'ID,Nome,Situacao,Matricula,Orgao,Telefone,Endereco,DataNascimento,DataCriacao,DataValidade,CaminhoDaFoto,Titular'.split(',');

const parsedData = [];

for (let i = 1; i < lines.length; i++) {
  let line = lines[i].trim();
  if (!line) continue;
  
  if (line.startsWith('"') && line.endsWith('"')) {
    line = line.substring(1, line.length - 1);
    line = line.replace(/""/g, '"');
  }

  const rowArray = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      rowArray.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  rowArray.push(current.trim());
  
  const rowObj = {};
  for (let k = 0; k < headers.length; k++) {
    let val = rowArray[k] || '';
    val = val.replace(/[\r\n]/g, '').trim();
    if (headers[k] === 'Endereco') {
        val = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    rowObj[headers[k]] = val;
  }
  parsedData.push(rowObj);
}

const titulares = parsedData.filter(r => r.Situacao && !r.Situacao.toLowerCase().includes('dependente'));

for (const row of parsedData) {
  if (row.Situacao && row.Situacao.toLowerCase().includes('dependente') && !row.Titular) {
    if (row.Matricula) {
      let baseMatricula = row.Matricula.split('-')[0];
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

let finalCsv = headers.join(',') + '\n';
for (const row of parsedData) {
  const rowVals = headers.map(h => {
    let val = row[h] || '';
    if (val.includes(',')) {
      return '"' + val + '"';
    }
    return val;
  });
  finalCsv += rowVals.join(',') + '\n';
}

fs.writeFileSync('Banco_Limpo.csv', finalCsv);
console.log('Successfully rebuilt Banco_Limpo.csv from scratch!');
