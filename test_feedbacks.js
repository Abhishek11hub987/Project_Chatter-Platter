import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeedback() {
  console.log("Checking feedbacks table...");
  const { data: readData, error: readError } = await supabase.from('feedbacks').select('*');
  console.log("Read Result:", { readData, readError });

  console.log("Attempting insert...");
  const { data: insertData, error: insertError } = await supabase.from('feedbacks').insert([{
    rating: 5,
    comment: 'Test script feedback'
  }]);
  
  console.log("Insert Result:", { insertData, insertError });
}

testFeedback();
