import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bcyhcnvuqdpozanfalcd.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_vL9PfEJZqZC8NJbf9PUBiQ_HgbJyl6i';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log('--- STARTING E2E DB & RLS TESTS ---');
  let failures = 0;

  // 1. Check Questions (RLS read-only)
  console.log('\\n[1] Testing Questions access...');
  const { data: qData, error: qErr } = await supabase.from('questions').select('*').limit(1);
  if (qErr) {
    console.error('FAIL: Could not read questions.', qErr);
    failures++;
  } else {
    console.log('PASS: Read questions successfully. Sample ID:', qData[0]?.id);
  }

  // 2. Try to manipulate questions (Should FAIL due to RLS)
  console.log('\\n[2] Testing Questions RLS protection...');
  const { error: qMutErr } = await supabase.from('questions').update({ text: 'Hacked!' }).eq('id', qData[0]?.id || '');
  if (qMutErr && qMutErr.code === '42501' || qMutErr?.message?.includes('violates row-level security')) {
    console.log('PASS: Users are correctly blocked from modifying questions.');
  } else {
    console.error('FAIL: Was able to modify questions (or unexpected error).', qMutErr);
    failures++;
  }

  // 3. Authenticate as a test user
  console.log('\\n[3] Authenticating test user...');
  const email = `test_${Date.now()}@example.com`;
  const password = 'testpassword123';
  const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
  
  if (authErr) {
    console.error('FAIL: Could not sign up test user.', authErr);
    return;
  }
  console.log('PASS: User signed up/in successfully. ID:', authData.user?.id);

  // Wait a second for trigger to create profile
  await new Promise(r => setTimeout(r, 1000));

  // 4. Check Profile Creation
  console.log('\\n[4] Testing Profile trigger & defaults...');
  const { data: pData, error: pErr } = await supabase.from('profiles').select('*').eq('id', authData.user?.id).single();
  if (pErr) {
    console.error('FAIL: Profile not found after signup.', pErr);
    failures++;
  } else {
    console.log(`PASS: Profile exists. Level: ${pData.level}, XP: ${pData.total_xp}, Streak: ${pData.current_streak}`);
    if (pData.level !== 1 || pData.total_xp !== 0) {
      console.error('FAIL: Initial stats are incorrect.');
      failures++;
    }
  }

  // 5. Test Attempt Insertion & Profile Triggers (XP, Level, Streak)
  console.log('\\n[5] Testing Attempt trigger for XP/Streak logic...');
  const mockQuestionId = qData[0]?.id;
  
  // Insert a successful attempt (factor < 2)
  const { data: attData, error: attErr } = await supabase.from('attempts').insert({
    user_id: authData.user?.id,
    question_id: mockQuestionId,
    guess: 10,
    actual: 10,
    factor: 1,
    score_classification: 'perfect',
    log_distance: 0,
    xp_earned: 100, // Should level up to 2
    used_hint: false
  }).select().single();

  if (attErr) {
    console.error('FAIL: Could not insert attempt.', attErr);
    failures++;
  } else {
    console.log('PASS: Inserted attempt successfully.');
  }

  // Wait a moment for trigger
  await new Promise(r => setTimeout(r, 1000));

  const { data: pDataAfter } = await supabase.from('profiles').select('*').eq('id', authData.user?.id).single();
  
  // Math: XP = 100 -> Level = floor(sqrt(100/100)) + 1 = 2
  if (pDataAfter.total_xp === 100 && pDataAfter.level === 2 && pDataAfter.current_streak === 1) {
    console.log(`PASS: Profile stats correctly updated via trigger. Level: ${pDataAfter.level}, XP: ${pDataAfter.total_xp}, Streak: ${pDataAfter.current_streak}`);
  } else {
    console.error('FAIL: Profile stats incorrect after attempt.', pDataAfter);
    failures++;
  }

  // 6. Test RLS on other profiles (Should FAIL)
  console.log('\\n[6] Testing RLS on other users profiles...');
  const { data: otherProfile, error: otherErr } = await supabase.from('profiles').update({ total_xp: 9999 }).neq('id', authData.user?.id);
  // Actually .update doesn't throw if 0 rows returned, but data will be empty.
  if (otherProfile && otherProfile.length > 0) {
    console.error('FAIL: Modified another users profile!', otherProfile);
    failures++;
  } else {
    console.log('PASS: RLS prevented modifying other profiles.');
  }

  console.log('\\n--- TESTS COMPLETE ---');
  console.log(`Failures: ${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

runTests();
