const fs = require('fs');
const content = fs.readFileSync('Banco_ASPMM_Organizado(in).csv', 'utf8');
const lines = content.split('\n');

// Set the correct headers
lines[0] = 'ID,Nome,Situacao,Matricula,Orgao,Telefone,Endereco,DataNascimento,DataCriacao,DataValidade,CaminhoDaFoto,Titular';

for (let i = 1; i < lines.length; i++) {
  let line = lines[i].trim();
  if (line.startsWith('"') && line.endsWith('"')) {
    // Remove the first and last quote
    line = line.substring(1, line.length - 1);
    // Unescape inner quotes
    line = line.replace(/""/g, '"');
    lines[i] = line;
  }
}

fs.writeFileSync('Banco_Limpo.csv', lines.join('\n'));
console.log('Fixed Banco_Limpo.csv!');
