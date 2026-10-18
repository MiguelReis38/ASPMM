const fs = require('fs');
const Papa = require('papaparse');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, getDocs, setDoc } = require('firebase/firestore');
const crypto = require('crypto');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
}

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function ensureAuthUser(email, password, displayName) {
  const apiKey = firebaseConfig.apiKey;
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName,
      returnSecureToken: true,
    }),
  });
  const signUpData = await signUpRes.json();
  if (signUpRes.ok && signUpData.localId) {
    return signUpData.localId;
  }

  const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
  const signInData = await signInRes.json();
  if (signInRes.ok && signInData.localId) {
    return signInData.localId;
  }

  throw new Error(`Could not create or sign in user ${email}: ${JSON.stringify(signUpData)}`);
}

function normalizeCategory(raw, titularCol) {
  const s = (raw || '').trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('verde cart')) return 'Verde Carterinha';
  if (lower.startsWith('amarela ca')) return 'Amarela Carterinha';
  if (lower.startsWith('branca cart')) return 'Branca Carterinha';
  if (lower.startsWith('dep. n')) return 'Dep. Não Pagante Menor';
  if (lower.includes('dependente')) return 'Dependente';
  if (!s || lower === 'escolha') {
    if (titularCol && titularCol.trim() !== '' && titularCol.trim().toLowerCase() !== 'titular') {
      return 'Dependente';
    }
    return 'Titular';
  }
  return s;
}

function parseCreatedAt(raw) {
  if (!raw || !raw.trim()) return new Date().toISOString();
  const d = new Date(raw.trim().replace(' ', 'T'));
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

async function seed() {
  console.log('1. Verificando contas de Presidente e Admin Financeiro no Firebase Auth...');

  const presidentUid = await ensureAuthUser('miguel.alipio2008@gmail.com', '030501', 'Miguel Alipio (Presidente)');
  const adminUid = await ensureAuthUser('aspmmarilia@gmail.com', '030501', 'Admin Financeiro');

  // Clear old non-admin members if --reset is passed
  if (process.argv.includes('--reset')) {
    console.log('Limpando registros anteriores de members para reimportação limpa...');
    const snap = await getDocs(collection(db, 'members'));
    const docs = snap.docs.filter((d) => d.id !== presidentUid && d.id !== adminUid);
    for (let i = 0; i < docs.length; i += 400) {
      const b = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }

  await setDoc(doc(db, 'members', presidentUid), {
    id: presidentUid,
    user_id: presidentUid,
    email: 'miguel.alipio2008@gmail.com',
    full_name: 'Miguel Alipio (Presidente)',
    cpf: '00000000000',
    birth_date: '1970-01-01',
    role: 'president',
    status: 'active',
    category: 'Titular',
    is_dependent: false,
    member_code: 'PRESIDENTE',
    workplace: 'ASPMM',
    created_at: new Date().toISOString(),
  });

  await setDoc(doc(db, 'members', adminUid), {
    id: adminUid,
    user_id: adminUid,
    email: 'aspmmarilia@gmail.com',
    full_name: 'Admin Financeiro',
    cpf: 'FINANCEIRO',
    birth_date: '1970-01-01',
    role: 'admin',
    status: 'active',
    category: 'Titular',
    is_dependent: false,
    member_code: 'FINANCEIRO',
    workplace: 'ASPMM',
    created_at: new Date().toISOString(),
  });

  console.log('2. Lendo Banco_Limpo.csv para importar associados e dependentes...');
  const csvContent = fs.readFileSync('Banco_Limpo.csv', 'utf8');
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = parsed.data.filter((r) => r.Nome && r.Nome.trim() !== '');

  const usedCodes = new Set(['PRESIDENTE', 'FINANCEIRO']);
  function genCode() {
    let code = '';
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  }

  function isDepRow(r) {
    const cat = normalizeCategory(r.Situacao, r.Titular).toLowerCase();
    return cat.includes('dep');
  }

  const titulares = rows.filter((r) => !isDepRow(r));
  const dependentes = rows.filter((r) => isDepRow(r));

  console.log(`   Titulares (Titular / Verde / Amarela): ${titulares.length} | Dependentes: ${dependentes.length}`);

  const titularDocs = [];
  const titularByName = new Map();
  const titularByBaseMatricula = new Map();

  for (const row of titulares) {
    const id = crypto.randomUUID();
    const code = genCode();
    const birthDate =
      row.DataNascimento && row.DataNascimento.trim() !== '' && row.DataNascimento.trim() !== '1990-01-01'
        ? row.DataNascimento.trim()
        : null;
    const validityDate = row.DataValidade && row.DataValidade.trim() !== '' ? row.DataValidade.trim() : null;
    const category = normalizeCategory(row.Situacao, row.Titular);

    const docData = {
      id,
      user_id: null,
      member_code: code,
      card_number: code,
      full_name: row.Nome.trim(),
      cpf: row.CPF ? String(row.CPF).trim() : null,
      status: 'active',
      category,
      is_dependent: false,
      primary_member_id: null,
      workplace: row.Orgao && row.Orgao !== 'Escolha' ? row.Orgao.trim() : 'Não informado',
      birth_date: birthDate,
      address: row.Endereco ? row.Endereco.trim() : null,
      phone: row.Telefone ? row.Telefone.trim() : null,
      validity_date: validityDate,
      matricula: row.Matricula ? row.Matricula.trim() : null,
      photo_url: null,
      created_at: parseCreatedAt(row.DataCriacao),
      role: 'member',
    };

    titularDocs.push(docData);
    titularByName.set(docData.full_name.toLowerCase(), docData);
    if (docData.matricula) {
      const baseMat = docData.matricula.split('-')[0].trim();
      if (baseMat && !titularByBaseMatricula.has(baseMat)) {
        titularByBaseMatricula.set(baseMat, docData);
      }
    }
  }

  const dependenteDocs = [];
  let linkedCount = 0;

  for (const row of dependentes) {
    const id = crypto.randomUUID();
    const code = genCode();
    const birthDate =
      row.DataNascimento && row.DataNascimento.trim() !== '' && row.DataNascimento.trim() !== '1990-01-01'
        ? row.DataNascimento.trim()
        : null;
    const validityDate = row.DataValidade && row.DataValidade.trim() !== '' ? row.DataValidade.trim() : null;
    const category = normalizeCategory(row.Situacao, row.Titular);

    let primaryId = null;
    const titularRef = row.Titular ? row.Titular.trim() : '';
    if (titularRef && titularRef.toLowerCase() !== 'titular') {
      const exact = titularByName.get(titularRef.toLowerCase());
      if (exact) {
        primaryId = exact.id;
      } else {
        for (const [nameKey, tDoc] of titularByName.entries()) {
          if (nameKey.includes(titularRef.toLowerCase()) || titularRef.toLowerCase().includes(nameKey)) {
            primaryId = tDoc.id;
            break;
          }
        }
      }
    }

    if (!primaryId && row.Matricula) {
      const baseMat = row.Matricula.split('-')[0].trim();
      const byMat = titularByBaseMatricula.get(baseMat);
      if (byMat) primaryId = byMat.id;
    }

    if (primaryId) linkedCount++;

    const docData = {
      id,
      user_id: null,
      member_code: code,
      card_number: code,
      full_name: row.Nome.trim(),
      cpf: row.CPF ? String(row.CPF).trim() : null,
      status: 'active',
      category,
      is_dependent: true,
      primary_member_id: primaryId,
      workplace: row.Orgao && row.Orgao !== 'Escolha' ? row.Orgao.trim() : 'Não informado',
      birth_date: birthDate,
      address: row.Endereco ? row.Endereco.trim() : null,
      phone: row.Telefone ? row.Telefone.trim() : null,
      validity_date: validityDate,
      matricula: row.Matricula ? row.Matricula.trim() : null,
      photo_url: null,
      created_at: parseCreatedAt(row.DataCriacao),
      role: 'member',
    };

    dependenteDocs.push(docData);
  }

  const allDocs = [...titularDocs, ...dependenteDocs];
  console.log(`3. Gravando ${allDocs.length} associados no Cloud Firestore (${linkedCount}/${dependenteDocs.length} dependentes vinculados)...`);

  const chunkSize = 400;
  for (let i = 0; i < allDocs.length; i += chunkSize) {
    const chunk = allDocs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      batch.set(doc(db, 'members', item.id), item);
    }
    await batch.commit();
    console.log(`   -> Lote gravado: ${Math.min(i + chunkSize, allDocs.length)} / ${allDocs.length}`);
  }

  console.log('Concluído com sucesso!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao executar seed:', err);
  process.exit(1);
});
