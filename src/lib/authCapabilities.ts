import { supabase } from '@/lib/supabase';

export async function getPasswordStatus(): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_my_password_status');
  if (error) throw error;
  return data === true;
}

export async function markPasswordCreated(): Promise<void> {
  const { error } = await supabase.rpc('mark_my_password_created');
  if (error) throw error;
}
