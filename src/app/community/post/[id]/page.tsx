'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/app/utils/supabase-client';
import { formatDistanceToNow } from 'date-fns';
import { HeartIcon, BookmarkIcon, ShareIcon, ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { Toaster } from 'react-hot-toast';
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

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId, session]);

  const fetchPost = async () => {
    try {
      // First get the post
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          image_url,
          created_at,
          author_id,
          upvote_count
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      // Get the author's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.author_id)
        .single();

      if (profileError) {
        console.warn('Profile not found for post author:', profileError);
      }

      // Get user interactions if logged in
      let userInteractions = { liked: false, saved: false };
      if (session?.user?.id) {
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', session.user.id).eq('post_id', postId),
          supabase.from('saves').select('post_id').eq('user_id', session.user.id).eq('post_id', postId)
        ]);

        userInteractions = {
          liked: !!(likes && likes.length > 0),
          saved: !!(saves && saves.length > 0)
        };
      }

      const postWithInteractions = {
        ...postData,
        profiles: profileData || {
          username: 'Unknown User',
          avatar_url: null
        },
        user_liked: userInteractions.liked,
        user_saved: userInteractions.saved
      };

      setPost(postWithInteractions);
      setLiked(userInteractions.liked);
      setSaved(userInteractions.saved);
      setLikeCount(postData.upvote_count);

      // Set edit form values
      setEditTitle(postData.title || '');
      setEditContent(postData.content || '');
      setEditImageUrl(postData.image_url || '');
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          author_id
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get unique author IDs
      const authorIds = [...new Set(commentsData.map(comment => comment.author_id))];

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

      // Combine comments with profiles
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.author_id) || {
          username: 'Unknown User',
          avatar_url: null
        }
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]); // Set empty array on error
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('Please log in to comment');
      return;
    }
    
    if (commentContent.trim().length === 0) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmittingComment(true);

    try {
      const { error } = await supabase.from('comments').insert({
        content: commentContent.trim(),
        post_id: postId,
        author_id: session.user.id,
      });
      
      if (error) throw error;
      
      toast.success('Comment added successfully!');
      setCommentContent('');
      fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const toggleLike = async () => {
    if (!session) {
      toast.error('Please log in to like posts');
      return;
    }

    try {
      const newLiked = !liked;
      
      if (newLiked) {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: session.user.id, post_id: postId });
        
        if (error) throw error;
        
        // Update upvote_count in posts table
        await supabase
          .from('posts')
          .update({ upvote_count: likeCount + 1 })
          .eq('id', postId);
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', postId);
        
        if (error) throw error;
        
        // Update upvote_count in posts table
        await supabase
          .from('posts')
          .update({ upvote_count: Math.max(0, likeCount - 1) })
          .eq('id', postId);
      }

      setLiked(newLiked);
      setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const toggleSave = async () => {
    if (!session) {
      toast.error('Please log in to save posts');
      return;
    }

    try {
      const newSaved = !saved;
      
      if (newSaved) {
        const { error } = await supabase
          .from('saves')
          .insert({ user_id: session.user.id, post_id: postId });
        
        if (error) throw error;
        toast.success('Post saved!');
      } else {
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('user_id', session.user.id)
          .eq('post_id', postId);
        
        if (error) throw error;
        toast.success('Post unsaved!');
      }

      setSaved(newSaved);
      
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update save');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form values
    if (post) {
      setEditTitle(post.title);
      setEditContent(post.content);
      setEditImageUrl(post.image_url || '');
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session || !post) return;

    if (editTitle.trim().length === 0) {
      toast.error('Post title is required');
      return;
    }

    if (editContent.trim().length === 0) {
      toast.error('Post content cannot be empty');
      return;
    }

    if (editContent.length > 280) {
      toast.error('Post content must be 280 characters or less');
      return;
    }

    setIsUpdating(true);

    try {
      const updateData: any = {
        title: editTitle.trim(),
        content: editContent.trim(),
      };

      if (editImageUrl.trim()) {
        updateData.image_url = editImageUrl.trim();
      } else {
        updateData.image_url = null;
      }

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post updated successfully!');
      setIsEditing(false);
      fetchPost(); // Refresh post data
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!session || !post) return;

    setIsDeleting(true);

    try {
      // Delete comments first
      await supabase.from('comments').delete().eq('post_id', postId);

      // Delete likes
      await supabase.from('likes').delete().eq('post_id', postId);

      // Delete saves
      await supabase.from('saves').delete().eq('post_id', postId);

      // Delete the post
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) throw error;

      toast.success('Post deleted successfully!');
      router.push('/community');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/community" className="text-blue-400 hover:underline">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = session?.user?.id === post.author_id;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#374151",
            color: "#f3f4f6",
            border: "1px solid #4b5563",
          },
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href="/community"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Community
        </Link>

        {/* Post Content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                {post.profiles.avatar_url ? (
                  <img 
                    src={post.profiles.avatar_url} 
                    alt={post.profiles.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-300 font-medium">
                    {post.profiles.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
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

            {/* Author Actions */}
            {isAuthor && !isEditing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEdit}
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-all"
                  title="Edit post"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-all"
                  title="Delete post"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Edit Form or Display */}
          {isEditing ? (
            <form onSubmit={handleUpdatePost} className="space-y-4 mb-6">
              <div>
                <input
                  type="text"
                  placeholder="Post title..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  disabled={isUpdating}
                />
              </div>
              <div>
                <textarea
                  placeholder="What's on your mind?"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows={6}
                  maxLength={280}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  disabled={isUpdating}
                />
                <div className="text-right text-sm text-gray-400 mt-1">
                  {editContent.length}/280 characters
                </div>
              </div>
              <div>
                <input
                  type="url"
                  placeholder="Image URL (optional)..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  disabled={isUpdating}
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || editTitle.trim().length === 0 || editContent.trim().length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Post'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Title */}
              <h1 className="text-2xl font-bold text-white mb-4">{post.title}</h1>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg">
                  {post.content}
                </p>
              </div>

              {/* Image */}
              {post.image_url && (
                <div className="mb-6">
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
            </>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-6 pt-4 border-t border-gray-700">
            <button
              onClick={toggleLike}
              className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              {liked ? (
                <HeartSolidIcon className="h-6 w-6 text-red-500" />
              ) : (
                <HeartIcon className="h-6 w-6" />
              )}
              <span className="font-medium">{likeCount}</span>
            </button>

            <button
              onClick={toggleSave}
              className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors"
            >
              {saved ? (
                <BookmarkSolidIcon className="h-6 w-6 text-blue-500" />
              ) : (
                <BookmarkIcon className="h-6 w-6" />
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors"
            >
              <ShareIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            Comments ({comments.length})
          </h2>

          {/* Add Comment Form */}
          {session ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Add a comment..."
                rows={3}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmittingComment}
              />
              <div className="flex justify-end mt-3">
                <button
                  disabled={isSubmittingComment || commentContent.trim().length === 0}
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg text-center">
              <p className="text-gray-300 mb-2">Please log in to comment</p>
              <Link href="/login" className="text-blue-400 hover:underline">
                Sign In
              </Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-700 pb-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {comment.profiles.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt={comment.profiles.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-300 font-medium text-sm">
                          {comment.profiles.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Link
                          href={`/profile/${comment.profiles.username}`}
                          className="font-medium text-white hover:text-blue-400 transition-colors"
                        >
                          {comment.profiles.username}
                        </Link>
                        <span className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Delete Post</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this post? This action cannot be undone and will also delete all comments and interactions.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Post'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
