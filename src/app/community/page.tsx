'use client';

import { Suspense, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/app/utils/supabase-client";
import { ensureUserProfile } from "@/app/utils/profileUtils";
import PostsSection from "@/app/components/community/PostsSection";
import PostBar from "@/app/components/community/PostBar";
import UserSection from "@/app/components/community/UserSection";
import { Toaster } from "react-hot-toast";
import type { Session } from '@supabase/auth-helpers-nextjs';

export default function CommunityPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        // Ensure user has a profile (non-blocking)
        if (session?.user) {
          ensureUserProfile(session.user.id, session.user.email || undefined).catch(error => {
            console.warn('Failed to ensure user profile:', error);
          });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);

        // Ensure user has a profile (non-blocking)
        if (session?.user) {
          ensureUserProfile(session.user.id, session.user.email || undefined).catch(error => {
            console.warn('Failed to ensure user profile:', error);
          });
        }
      }
    );

    // Set a maximum loading time of 5 seconds
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
              <p className="text-gray-400">Connect, share, and learn together</p>
            </div>

            <PostBar session={session} />
            <Suspense fallback={<div className="animate-pulse space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
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
            </div>}>
              <PostsSection session={session} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <UserSection session={session} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
