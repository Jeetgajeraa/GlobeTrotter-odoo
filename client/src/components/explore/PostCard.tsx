"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Space_Grotesk, Inter } from "next/font/google";
import { CommunityPost } from "@/src/libs/types";
import { likeCommunityPost, unlikeCommunityPost } from "@/src/libs/interaction/dataPoster";
import { deleteCommunityPost } from "@/src/libs/interaction/dataDeleter";
import { toast } from "@/src/hooks/useToast";

import { PostImage } from "./PostImage";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

interface PostCardProps {
  post: CommunityPost;
  currentUserId?: string | null;
  onPostDeleted?: (postId: string) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return "Just now";
  } catch {
    return dateString;
  }
}

export function PostCard({ post, currentUserId, onPostDeleted }: PostCardProps) {
  const [likes, setLikes] = useState<number>(post.likeCount);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const authorName = `${post.user?.firstName || "Anonymous"} ${post.user?.lastName || ""}`.trim();
  const authorInitials = `${post.user?.firstName?.[0] || ""}${post.user?.lastName?.[0] || ""}`.toUpperCase() || "U";
  const isOwner = currentUserId && (currentUserId === post.userId || currentUserId === post.user?.id);

  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const previousLiked = isLiked;
    const previousCount = likes;

    // Optimistic UI update
    if (previousLiked) {
      setIsLiked(false);
      setLikes(Math.max(0, previousCount - 1));
    } else {
      setIsLiked(true);
      setLikes(previousCount + 1);
    }

    try {
      if (previousLiked) {
        const res = await unlikeCommunityPost(post.id);
        if (!res?.success) {
          // Rollback
          setIsLiked(previousLiked);
          setLikes(previousCount);
        } else if (res.data?.likeCount !== undefined) {
          setLikes(res.data.likeCount);
        }
      } else {
        const res = await likeCommunityPost(post.id);
        if (!res?.success) {
          // Rollback
          setIsLiked(previousLiked);
          setLikes(previousCount);
        } else if (res.data?.likeCount !== undefined) {
          setLikes(res.data.likeCount);
        }
      }
    } catch {
      setIsLiked(previousLiked);
      setLikes(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    try {
      const res = await deleteCommunityPost(post.id);
      if (res?.success) {
        toast({ title: "Post deleted", description: "Your post has been removed." });
        onPostDeleted?.(post.id);
      } else {
        toast({
          title: "Failed to delete post",
          description: res?.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error deleting post",
        description: err.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article
      className="bg-white rounded-2xl border border-[#E7E0D4] p-5 sm:p-6 shadow-[0_1px_2px_rgba(36,27,47,0.04),0_8px_24px_rgba(36,27,47,0.06)] hover:border-[#D6CCBC] transition-all duration-200 flex flex-col sm:flex-row gap-5 items-start relative group"
    >
      {/* ── Left Column: User Image & Username ── */}
      <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 w-full sm:w-[120px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#E7E0D4]/60 pb-3 sm:pb-0 sm:pr-4">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-[#714B67]/20 overflow-hidden bg-[#F1E7EE] flex items-center justify-center shadow-sm shrink-0">
          {post.user?.profilePhoto ? (
            <img
              src={post.user.profilePhoto}
              alt={authorName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span className={`text-[18px] sm:text-[20px] font-bold text-[#714B67] ${spaceGrotesk.className}`}>
              {authorInitials}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:text-center min-w-0">
          <span
            className={`text-[14px] font-semibold text-[#241B2F] truncate max-w-[150px] sm:max-w-[110px] ${inter.className}`}
            title={authorName}
          >
            {authorName}
          </span>
          {(post.user?.city || post.user?.country) && (
            <span className="text-[11px] text-[#9A93A6] truncate max-w-[150px] sm:max-w-[110px]">
              {[post.user.city, post.user.country].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* ── Right Column: Title, Content, Image, Like Count & Actions ── */}
      <div className="flex-1 w-full flex flex-col justify-between min-w-0">
        <div>
          {/* Top metadata row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2
              className={`text-[18px] sm:text-[20px] font-bold text-[#241B2F] leading-snug tracking-tight ${spaceGrotesk.className}`}
            >
              {post.title}
            </h2>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] font-medium text-[#9A93A6]">
                {formatRelativeTime(post.createdAt)}
              </span>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-[#9A93A6] hover:text-[#C0392B] p-1 rounded-md hover:bg-[#F1EDE6] transition-colors cursor-pointer"
                  title="Delete post"
                  aria-label="Delete post"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Post Content */}
          <p className={`text-[14px] sm:text-[15px] text-[#5C5468] leading-relaxed mb-4 whitespace-pre-wrap ${inter.className}`}>
            {post.content}
          </p>

          {/* Post Image Display Component */}
          {post.imageUrl && (
            <div className="mb-4">
              <PostImage
                src={post.imageUrl}
                alt={post.title}
                caption={post.title}
              />
            </div>
          )}

          {/* Linked Trip Badge if available */}
          {post.trip && (
            <div className="mb-4">
              <Link
                href={post.trip.shareSlug ? `/trips/share/${post.trip.shareSlug}` : `/trips/${post.trip.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E0D4] hover:border-[#714B67]/40 text-[#714B67] hover:text-[#4E3347] text-[13px] font-medium transition-all group/trip"
              >
                <span className="text-[#E0663D]">📍</span>
                <span className="font-semibold">{post.trip.name}</span>
                <span className="text-[#9A93A6] group-hover/trip:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Card Footer: Like count, Interaction button */}
        <div className="pt-3 border-t border-[#E7E0D4]/60 flex items-center justify-between">
          <button
            onClick={handleLikeToggle}
            disabled={isLiking}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
              isLiked
                ? "bg-[#F1E7EE] text-[#714B67] shadow-sm"
                : "bg-[#FAF8F5] text-[#5C5468] hover:bg-[#F1EDE6] hover:text-[#241B2F]"
            }`}
            aria-label={isLiked ? "Unlike post" : "Like post"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isLiked ? "#714B67" : "none"}
              stroke={isLiked ? "#714B67" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${isLiked ? "scale-110" : "scale-100 group-hover:scale-105"}`}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>{likes} {likes === 1 ? "like" : "likes"}</span>
          </button>

          <span className="text-[12px] font-mono text-[#9A93A6]">
            {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </article>
  );
}
