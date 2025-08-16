const XLSX = require('xlsx');
const fs = require('fs');

try {
  const buffer = fs.readFileSync('./lise cevp knımlr.xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const headerIndex = 2;
  const headerRow = rows[headerIndex];
  console.log('HEADER:', headerRow);
  
  const startIndex = headerIndex + 1;
  
  console.log('\n=== TÜM DERSLER ===');
  const dersler = new Set();
  const testler = new Set();
  
  for (let i = startIndex; i < Math.min(startIndex + 50, rows.length); i++) {
    const r = rows[i];
    if (!r || r.every(c => (c === null || c === undefined || c === ''))) continue;
    
    const ders = r[2]; // Ders sütunu
    const test = r[1]; // Test sütunu
    const aSoru = r[3]; // A Soru
    const cevap = r[5]; // Cevap
    
    if (ders) dersler.add(ders);
    if (test) testler.add(test);
    
    console.log(`Satır ${i}: Test=${test}, Ders=${ders}, ASoru=${aSoru}, Cevap=${cevap}`);
  }
  
  console.log('\n=== ÖZET ===');
  console.log('Toplam satır:', rows.length);
  console.log('Farklı dersler:', Array.from(dersler));
  console.log('Farklı testler:', Array.from(testler));
  
} catch (error) {
  console.error('Hata:', error.message);
} 