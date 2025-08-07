'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/app/utils/supabase-client';
import PostCard from './PostCard';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import type { Session } from '@supabase/auth-helpers-nextjs';

interface Post {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  author_id: string;
  upvote_count: number;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  user_liked: boolean;
  user_saved: boolean;
}

interface PostsSectionProps {
  session: Session | null;
}

export default function PostsSection({ session }: PostsSectionProps) {
  const supabase = createSupabaseBrowserClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'upvote_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchPosts = async (offset = 0) => {
    try {
      const userId = session?.user?.id;

      // Reset loading states
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // First get posts
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          image_url,
          created_at,
          author_id,
          upvote_count
        `);

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // Apply sorting
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + 9);

      const { data: postsData, error } = await query;

      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        if (offset === 0) {
          setPosts([]);
        }
        setHasMore(false);
        return;
      }

      // Get unique author IDs
      const authorIds = [...new Set(postsData.map(post => post.author_id))];

      // Get profiles for all authors
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', authorIds);

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles by ID
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Get user interactions if logged in
      let postsWithInteractions: Post[] = [];
      if (userId && postsData?.length) {
        const postIds = postsData.map(p => p.id);

        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
          supabase.from('saves').select('post_id').eq('user_id', userId).in('post_id', postIds)
        ]);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        const savedPostIds = new Set(saves?.map(s => s.post_id) || []);

        postsWithInteractions = postsData.map(post => ({
          ...post,
          profiles: profilesMap.get(post.author_id) || {
            username: 'Unknown User',
            avatar_url: null
          },
          user_liked: likedPostIds.has(post.id),
          user_saved: savedPostIds.has(post.id)
        }));
      } else {
        postsWithInteractions = (postsData || []).map(post => ({
          ...post,
          profiles: profilesMap.get(post.author_id) || {
            username: 'Unknown User',
            avatar_url: null
          },
          user_liked: false,
          user_saved: false
        }));
      }

      if (offset === 0) {
        setPosts(postsWithInteractions);
      } else {
        setPosts(prev => [...prev, ...postsWithInteractions]);
      }

      setHasMore(postsWithInteractions.length === 10);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Set empty posts array on error to prevent infinite loading
      if (offset === 0) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPosts();
    }, 100); // Small delay to prevent rapid re-fetching

    return () => clearTimeout(timeoutId);
  }, [session?.user?.id, searchQuery, sortBy, sortOrder]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchPosts(posts.length);
    }
  };

  if (loading) {
    return <PostsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Sort Controls */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts by title..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center space-x-3">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
            <select
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_at' | 'upvote_count')}
            >
              <option value="created_at">Sort by Date</option>
              <option value="upvote_count">Sort by Upvotes</option>
            </select>
            <select
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-300 mb-2">
            {searchQuery ? 'No posts found' : 'No posts yet'}
          </p>
          <p className="text-gray-400">
            {searchQuery ? 'Try adjusting your search terms' : 'Be the first to share something with the community!'}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              session={session}
              onUpdate={() => fetchPosts()}
            />
          ))}
          
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6 text-gray-400">
              <p>You've reached the end!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-8 bg-gray-700 rounded w-16"></div>
            <div className="h-8 bg-gray-700 rounded w-16"></div>
            <div className="h-8 bg-gray-700 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
