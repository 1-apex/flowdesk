import { createSupabaseServerClient } from "@/utils/supabase-server";

export async function fetchPosts() {
  const supabase = createSupabaseServerClient();
  try {
    let query = supabase
      .from("posts")
      .select(
        `
          id,
          content,
          created_at,
          author_id,
          upvote_count,
        `
      )
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: postsData, error } = await query;
    

    if (error) throw error;

    return postsData || [];
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}
