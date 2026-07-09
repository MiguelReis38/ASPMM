const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createAdmin() {
  const email = 'aspmmarilia@gmail.com';
  const password = '030501';

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError && !authError.message.includes('already exists')) {
    console.error('Auth error:', authError);
    return;
  }

  // Get user ID
  let userId = authData?.user?.id;
  if (!userId) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    userId = user.id;
  }

  // Check if member exists
  const { data: existing } = await supabase.from('members').select('id').eq('user_id', userId).single();
  if (existing) {
    await supabase.from('members').update({ role: 'admin', full_name: 'Admin Financeiro' }).eq('id', existing.id);
  } else {
    await supabase.from('members').insert({
      user_id: userId,
      role: 'admin',
      full_name: 'Admin Financeiro',
      member_code: 'FINANCEIRO',
      cpf: 'FINANCEIRO',
      status: 'active'
    });
  }
  
  console.log('Admin account created successfully!');
}

createAdmin();
