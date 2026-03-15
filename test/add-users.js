const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function addUsers() {
  const users = [
    { email: 'admin@clmb.sti.archives', password: 'admin123', fullname: 'Admin', role: 'admin' },
    { email: 'admin2@clmb.sti.archives', password: 'admin2123', fullname: 'Admin2', role: 'admin' },
    { email: 'admin3@clmb.sti.archives', password: 'admin3123', fullname: 'Admin3', role: 'admin' },
    { email: 'user@clmb.sti.archives', password: 'usertesting', fullname: 'Test User', role: 'user' }
  ];

  for (const user of users) {
    const hashedPassword = await hashPassword(user.password);
    
    const { data, error } = await supabase
      .from('users')
      .upsert({
        email: user.email,
        password: hashedPassword,
        fullname: user.fullname,
        role: user.role,
        verified: true,
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) {
      console.error(`Error adding ${user.email}:`, error);
    } else {
      console.log(`Added user: ${user.email} (${user.fullname})`);
    }
  }
}

addUsers();
