'use server';

import { createSupabaseServerClient } from '@/utils/supabase-server';
import { revalidateTag } from 'next/cache';

export async function submitPost(content: string) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  const { error } = await supabase.from('posts').insert({
    content,
    author_id: user.id,
  });
  if (error) throw error;

  revalidateTag('community-posts');
}
