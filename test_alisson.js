const fs = require('fs');
const content = fs.readFileSync('Banco_ASPMM_Organizado(in).csv', 'utf8');
const lines = content.split(/\r?\n/);
let line = lines[2].trim(); // Alisson is on line 2 (index 1 is Manuela)
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
console.log("rowArray[6]:", rowArray[6]);
