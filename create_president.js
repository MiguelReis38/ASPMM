const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient('https://sgdrdtotuavkekegsuwc.supabase.co', 'sb_secret_dN76pbQrmTvGAtkBJsqrEw_sBIC_oHH');

async function createPresident() {
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const user = usersData.users.find(u => u.email === 'miguel.alipio2008@gmail.com');
  const userId = user.id;

  const { error: dbError } = await supabaseAdmin.from('members').insert({
    user_id: userId,
    full_name: 'Miguel Alipio (Presidente)',
    cpf: '00000000000',
    birth_date: '1970-01-01',
    role: 'president',
    status: 'active',
    category: 'Titular',
    is_dependent: false,
    member_code: 'PRESIDENTE',
    workplace: 'ASPMM'
  });

  if (dbError) {
      console.error("Error creating member row:", dbError);
  } else {
      console.log("President created successfully!");
  }
}
createPresident();
