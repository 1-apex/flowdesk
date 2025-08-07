'use client';

import { useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/app/utils/supabase-client';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import type { Session } from '@supabase/auth-helpers-nextjs';

interface PostBarProps {
  session: Session | null;
  onPostCreated?: () => void;
}

export default function PostBar({ session, onPostCreated }: PostBarProps) {
  const supabase = createSupabaseBrowserClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!session) {
      return toast.error('Please log in to post');
    }

    if (title.trim().length === 0) {
      return toast.error('Post title is required');
    }

    if (content.trim().length === 0) {
      return toast.error('Post content cannot be empty');
    }

    if (content.length > 280) {
      return toast.error('Post content must be 280 characters or less');
    }

    startTransition(async () => {
      const postData: any = {
        title: title.trim(),
        content: content.trim(),
        author_id: session.user.id,
      };

      // Add image URL if provided
      if (imageUrl.trim()) {
        postData.image_url = imageUrl.trim();
      }

      const { error } = await supabase.from('posts').insert(postData);

      if (error) {
        console.error(error);
        toast.error('Failed to create post');
      } else {
        toast.success('Posted successfully!');
        setTitle('');
        setContent('');
        setImageUrl('');
        if (onPostCreated) onPostCreated();
      }
    });
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <input
          type="text"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={session ? "Post title..." : "Please log in to post"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending || !session}
          required
        />

        {/* Content Textarea */}
        <textarea
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={session ? "What's on your mind?" : "Please log in to post"}
          maxLength={280}
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isPending || !session}
          required
        />

        {/* Image URL Input */}
        <input
          type="url"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={session ? "Image URL (optional)..." : "Please log in to post"}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={isPending || !session}
        />

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {content.length}/280 characters
          </span>

          <button
            disabled={isPending || !session || title.trim().length === 0 || content.trim().length === 0}
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Posting...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4" />
                Post
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}