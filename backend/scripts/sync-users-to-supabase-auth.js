require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Starting user sync from users table to Supabase Auth...');

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('*');

  if (usersErr) {
    throw usersErr;
  }

  for (const user of users) {
    if (!user.email) {
      console.warn(`Skipping user with missing email (id=${user.id})`);
      continue;
    }

    // Check if this user already has an auth mapping
    if (user.auth_id) {
      console.log(`Skipping already-mapped user: ${user.email}`);
      continue;
    }

    // Try find existing Supabase auth user by email
    const { data: existed, error: lookupErr } = await supabase.auth.admin.listUsers({
      filter: `email=eq.${user.email}`
    });

    if (lookupErr) {
      console.error('Error listing Supabase auth users:', lookupErr.message || lookupErr);
      continue;
    }

    let authUser = existed?.users?.[0];

    if (!authUser) {
      // Create Supabase Auth user (password is randomized; user should reset or admin can set)
      const randomPassword = `P@ssw0rd_${Math.random().toString(36).slice(2, 10)}!`;
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: user.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          fullname: user.fullname || '',
          role: user.role || 'user'
        }
      });

      if (createErr) {
        console.error(`Failed to create auth user for ${user.email}:`, createErr.message || createErr);
        continue;
      }

      authUser = created;
      console.log(`Created auth user for ${user.email} with ID ${authUser.id}`);
    }

    // Update users table `auth_id` (add this column first to avoid errors)
    const { error: updateErr } = await supabase
      .from('users')
      .update({ auth_id: authUser.id })
      .eq('id', user.id);

    if (updateErr) {
      console.error(`Failed to set auth_id for ${user.email} in users table:`, updateErr.message || updateErr);
    } else {
      console.log(`Synced user ${user.email} -> auth_id ${authUser.id}`);
    }
  }

  console.log('User sync complete.');
}

run().catch(err => {
  console.error('Unexpected error in sync:', err.message || err);
  process.exit(1);
});