const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  const keep = ['aspmmarilia@gmail.com', 'aspmmarilia@hotmail.com', 'miguel.alipio2008@gmail.com'];
  
  for (const u of users.users) {
    if (!keep.includes(u.email)) {
      console.log("Deleting:", u.email);
      await supabase.auth.admin.deleteUser(u.id);
    } else {
      console.log("Keeping:", u.email);
    }
  }
}
clean();
