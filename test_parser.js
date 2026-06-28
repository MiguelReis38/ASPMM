const line = '19,ALISSON DOS REIS,Titular,01,PREFEITURA,14988268189,"RUA: BELINE MARCONATO , 303 CASA 05",1983-01-11,2025-01-19 15:04:48,2025-12-31,assets/uploads/abelha word.png,';
const rowArray = []; let current = ''; let inQuotes = false;
for (let j = 0; j < line.length; j++) {
  const char = line[j];
  if (char === '"') { inQuotes = !inQuotes; }
  else if (char === ',' && !inQuotes) { rowArray.push(current.trim()); current = ''; }
  else { current += char; }
}
rowArray.push(current.trim());
console.log(rowArray);
