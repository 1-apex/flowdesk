'use client';

import { HeartIcon, BookmarkIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { formatDistanceToNow } from 'date-fns';
import { createSupabaseBrowserClient } from '@/app/utils/supabase-client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
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

interface PostCardProps {
  post: Post;
  session: Session | null;
  onUpdate: () => void;
}

export default function PostCard({ post, session, onUpdate }: PostCardProps) {
  const supabase = createSupabaseBrowserClient();
  const [liked, setLiked] = useState(post.user_liked);
  const [saved, setSaved] = useState(post.user_saved);
  const [likeCount, setLikeCount] = useState(post.upvote_count);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLike = async () => {
    if (!session) {
      toast.error('Please log in to like posts');
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const newLiked = !liked;
      
      if (newLiked) {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: session.user.id, post_id: post.id });
        
        if (error) throw error;
        
        // Update upvote_count in posts table
        await supabase
          .from('posts')
          .update({ upvote_count: likeCount + 1 })
          .eq('id', post.id);
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', post.id);
        
        if (error) throw error;
        
        // Update upvote_count in posts table
        await supabase
          .from('posts')
          .update({ upvote_count: Math.max(0, likeCount - 1) })
          .eq('id', post.id);
      }

      setLiked(newLiked);
      setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSave = async () => {
    if (!session) {
      toast.error('Please log in to save posts');
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const newSaved = !saved;
      
      if (newSaved) {
        const { error } = await supabase
          .from('saves')
          .insert({ user_id: session.user.id, post_id: post.id });
        
        if (error) throw error;
        toast.success('Post saved!');
      } else {
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', post.id);
        
        if (error) throw error;
        toast.success('Post unsaved!');
      }

      setSaved(newSaved);
      
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update save');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community/post/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
          {post.profiles.avatar_url ? (
            <img 
              src={post.profiles.avatar_url} 
              alt={post.profiles.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-300 font-medium text-sm">
              {post.profiles.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <Link 
            href={`/profile/${post.profiles.username}`}
            className="font-semibold text-white hover:text-blue-400 transition-colors"
          >
            {post.profiles.username}
          </Link>
          <p className="text-sm text-gray-400">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="mb-3">
        <Link
          href={`/community/post/${post.id}`}
          className="text-xl font-semibold text-white hover:text-blue-400 transition-colors"
        >
          {post.title}
        </Link>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="mb-4">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full max-h-96 object-cover rounded-lg border border-gray-600"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-6 pt-3 border-t border-gray-700">
        <button
          onClick={toggleLike}
          disabled={isLoading}
          className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {liked ? (
            <HeartSolidIcon className="h-5 w-5 text-red-500" />
          ) : (
            <HeartIcon className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{likeCount}</span>
        </button>

        <button
          onClick={toggleSave}
          disabled={isLoading}
          className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
        >
          {saved ? (
            <BookmarkSolidIcon className="h-5 w-5 text-blue-500" />
          ) : (
            <BookmarkIcon className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}