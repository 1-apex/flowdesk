import { createSupabaseBrowserClient } from './supabase-client';

export async function ensureUserProfile(userId: string, email?: string, username?: string) {
  const supabase = createSupabaseBrowserClient();
  
  try {
    // First, check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Profile already exists
      return { success: true, profile: existingProfile };
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      throw fetchError;
    }

    // Profile doesn't exist, create it
    const defaultUsername = username || (email ? email.split('@')[0] : `user_${userId.slice(0, 8)}`);
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: defaultUsername,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return { success: true, profile: newProfile };
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return { success: false, error };
  }
}

export async function getOrCreateUserProfile(userId: string, email?: string, username?: string) {
  const supabase = createSupabaseBrowserClient();
  
  try {
    // Try to get the profile first
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      return { success: true, profile };
    }

    // If profile doesn't exist, create it
    if (error && error.code === 'PGRST116') {
      const result = await ensureUserProfile(userId, email, username);
      if (result.success) {
        // Fetch the complete profile
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        return { success: true, profile: fullProfile };
      }
      return result;
    }

    throw error;
  } catch (error) {
    console.error('Error getting or creating user profile:', error);
    return { success: false, error };
  }
}
