'use client';

import { useState, useEffect } from 'react';
import { User, Settings, Calendar, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/app/utils/supabase-client';
import { formatDistanceToNow } from 'date-fns';
import type { Session } from '@supabase/auth-helpers-nextjs';

interface UserData {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  posts_count: number;
  likes_received: number;
}

interface UserSectionProps {
  session: Session | null;
}

export default function UserSection({ session }: UserSectionProps) {
  const supabase = createSupabaseBrowserClient();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function fetchUserData() {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const [profileResult, postsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('username, avatar_url, created_at')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('posts')
            .select('id, upvote_count')
            .eq('author_id', session.user.id)
        ]);

        if (profileResult.error) {
          console.warn('Profile not found, user may need to complete setup');
          setLoading(false);
          return;
        }

        const totalLikes = postsResult.data?.reduce((sum, post) => sum + post.upvote_count, 0) || 0;

        setUserData({
          id: session.user.id,
          username: profileResult.data.username,
          avatar_url: profileResult.data.avatar_url,
          created_at: profileResult.data.created_at,
          posts_count: postsResult.data?.length || 0,
          likes_received: totalLikes
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [session?.user?.id, supabase]);

  if (loading) {
    return <UserSectionSkeleton />;
  }

  if (!session || !userData) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="text-center text-gray-400">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="font-medium text-gray-300 mb-2">Join the Community</h3>
          <p className="text-sm mb-4">Sign in to share posts and connect with others</p>
          <a href="/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const engagementRate = userData.posts_count > 0 
    ? (userData.likes_received / userData.posts_count).toFixed(1)
    : '0.0';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
          {userData.avatar_url ? (
            <img 
              src={userData.avatar_url} 
              alt={userData.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white text-lg truncate">
            {userData.username}
          </h2>
          <div className="flex items-center space-x-1 text-gray-400 text-sm">
            <Calendar className="w-3 h-3" />
            <span>
              Joined {formatDistanceToNow(new Date(userData.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div 
          onClick={() => setShowSettings((prev) => !prev)} 
          className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          {mounted && showSettings && (
            <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium text-white text-sm uppercase tracking-wide">
          Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <div className="font-semibold text-white text-xl">
              {userData.posts_count}
            </div>
            <div className="text-gray-400 text-xs">Posts</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded-lg">
            <div className="font-semibold text-white text-xl">
              {userData.likes_received}
            </div>
            <div className="text-gray-400 text-xs">Likes</div>
          </div>
        </div>
        <div className="text-center p-3 bg-gray-700 rounded-lg">
          <div className="font-semibold text-white text-xl">
            {engagementRate}
          </div>
          <div className="text-gray-400 text-xs">Avg Likes/Post</div>
        </div>
      </div>

      {/* Actions */}
      <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
        <Settings className="w-4 h-4" />
        <span>Edit Profile</span>
      </button>
    </div>
  );
}

function UserSectionSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="animate-pulse">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-16"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-700 rounded-lg"></div>
            <div className="h-16 bg-gray-700 rounded-lg"></div>
          </div>
          <div className="h-16 bg-gray-700 rounded-lg"></div>
          <div className="h-10 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
