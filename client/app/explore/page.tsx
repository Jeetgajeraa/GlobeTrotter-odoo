"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Space_Grotesk, Inter } from "next/font/google";
import { AppNav } from "@/src/components/AppNav";
import { PostCard } from "@/src/components/explore/PostCard";
import { CreatePostModal } from "@/src/components/explore/CreatePostModal";
import { ExploreToolbar } from "@/src/components/explore/ExploreToolbar";
import { getCommunityPosts, getMe } from "@/src/libs/interaction/dataGetter";
import {
  CommunityPost,
  GroupByOption,
  SortByOption,
  PostTypeFilter,
  AuthorFilter,
  DateRangeFilter,
  User,
} from "@/src/libs/types";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function ExplorePage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Search & Filter & Sort & Group states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [sortBy, setSortBy] = useState<SortByOption>("createdAt");
  const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");

  // Fetch current user
  useEffect(() => {
    getMe()
      .then((res) => {
        if (res?.success && res.data?.user) {
          setCurrentUser(res.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch posts from API
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await getCommunityPosts({
        limit: 50,
      });

      if (res?.success && res.data?.posts) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error("Error loading community posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Filtered & Sorted posts
  const processedPosts = useMemo(() => {
    let result = [...posts];

    // 1. Search Query (Title, Content, Author name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(query);
        const contentMatch = p.content.toLowerCase().includes(query);
        const authorName = `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.toLowerCase();
        const authorMatch = authorName.includes(query);
        return titleMatch || contentMatch || authorMatch;
      });
    }

    // 2. Post Type Filter
    if (postTypeFilter === "images") {
      result = result.filter((p) => Boolean(p.imageUrl));
    } else if (postTypeFilter === "trips") {
      result = result.filter((p) => Boolean(p.tripId || p.trip));
    }

    // 3. Author Filter
    if (authorFilter === "me" && currentUser) {
      result = result.filter((p) => p.userId === currentUser.id || p.user?.id === currentUser.id);
    }

    // 4. Date Range Filter
    if (dateRangeFilter !== "all") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfWeek = startOfDay - (now.getDay() * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      result = result.filter((p) => {
        const postTime = new Date(p.createdAt).getTime();
        if (dateRangeFilter === "today") return postTime >= startOfDay;
        if (dateRangeFilter === "week") return postTime >= startOfWeek;
        if (dateRangeFilter === "month") return postTime >= startOfMonth;
        return true;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === "likeCount") {
        return b.likeCount - a.likeCount;
      }
      if (sortBy === "updatedAt") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      // default createdAt
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [posts, searchQuery, postTypeFilter, authorFilter, dateRangeFilter, sortBy, currentUser]);

  // Grouped by User
  const groupedByUser = useMemo(() => {
    if (groupBy !== "user") return null;

    const map = new Map<string, { user: CommunityPost["user"]; posts: CommunityPost[] }>();
    processedPosts.forEach((post) => {
      const userId = post.userId || post.user?.id || "unknown";
      if (!map.has(userId)) {
        map.set(userId, { user: post.user, posts: [] });
      }
      map.get(userId)!.posts.push(post);
    });

    return Array.from(map.entries()).map(([userId, val]) => ({
      userId,
      user: val.user,
      posts: val.posts,
    }));
  }, [groupBy, processedPosts]);

  // Grouped by Date
  const groupedByDate = useMemo(() => {
    if (groupBy !== "date") return null;

    const today: CommunityPost[] = [];
    const thisWeek: CommunityPost[] = [];
    const thisMonth: CommunityPost[] = [];
    const older: CommunityPost[] = [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - (now.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    processedPosts.forEach((post) => {
      const postTime = new Date(post.createdAt).getTime();
      if (postTime >= startOfDay) {
        today.push(post);
      } else if (postTime >= startOfWeek) {
        thisWeek.push(post);
      } else if (postTime >= startOfMonth) {
        thisMonth.push(post);
      } else {
        older.push(post);
      }
    });

    return [
      { label: "Today", posts: today },
      { label: "This Week", posts: thisWeek },
      { label: "This Month", posts: thisMonth },
      { label: "Earlier Stories", posts: older },
    ].filter((group) => group.posts.length > 0);
  }, [groupBy, processedPosts]);

  const isFiltered =
    searchQuery.trim() !== "" ||
    postTypeFilter !== "all" ||
    authorFilter !== "all" ||
    dateRangeFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setPostTypeFilter("all");
    setAuthorFilter("all");
    setDateRangeFilter("all");
  };

  const handlePostCreated = (newPost: CommunityPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#241B2F] pb-24">
      {/* ── Top Header Navigation ── */}
      <AppNav />

      {/* ── Main Content Container ── */}
      <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10">
        {/* ── Page Header Row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-[28px] sm:text-[34px] font-bold text-[#241B2F] tracking-tight ${spaceGrotesk.className}`}>
              Explore Community
            </h1>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-5 py-2.5 rounded-xl bg-[#714B67] text-white hover:bg-[#4E3347] font-semibold text-[14px] shadow-sm transition-all duration-150 flex items-center gap-2 self-start sm:self-auto cursor-pointer ${inter.className}`}
          >
            <span className="text-lg leading-none">+</span>
            <span>Share a Story</span>
          </button>
        </div>

        {/* ── Explore Toolbar (Search, Filter, Group, Sort) ── */}
        <div className="mb-8">
          <ExploreToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            postTypeFilter={postTypeFilter}
            onPostTypeFilterChange={setPostTypeFilter}
            authorFilter={authorFilter}
            onAuthorFilterChange={setAuthorFilter}
            dateRangeFilter={dateRangeFilter}
            onDateRangeFilterChange={setDateRangeFilter}
            onResetFilters={handleResetFilters}
            isFiltered={isFiltered}
          />
        </div>

        {/* ── Feed Content Section ── */}
        {loading ? (
          /* Loading Skeletons */
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E7E0D4] p-6 shadow-sm flex flex-col sm:flex-row gap-5 animate-pulse"
              >
                <div className="flex sm:flex-col items-center gap-3 sm:gap-2 w-full sm:w-[120px] shrink-0">
                  <div className="w-14 h-14 rounded-full bg-[#F1EDE6]"></div>
                  <div className="w-16 h-3.5 bg-[#F1EDE6] rounded"></div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="w-2/3 h-5 bg-[#F1EDE6] rounded"></div>
                  <div className="w-full h-4 bg-[#F1EDE6] rounded"></div>
                  <div className="w-4/5 h-4 bg-[#F1EDE6] rounded"></div>
                  <div className="w-full h-32 bg-[#F1EDE6] rounded-xl mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : processedPosts.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-[#E7E0D4] p-10 text-center max-w-lg mx-auto shadow-sm my-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F1E7EE] text-[#714B67] flex items-center justify-center text-2xl">
              ✈️
            </div>
            <h3 className={`text-[18px] font-bold text-[#241B2F] mb-1.5 ${spaceGrotesk.className}`}>
              {isFiltered ? "No matching stories found" : "No community posts yet"}
            </h3>
            <p className="text-[14px] text-[#5C5468] mb-6">
              {isFiltered
                ? "Try adjusting your search keywords or clearing active filters to view more posts."
                : "Be the first traveler to share your itinerary, hidden spots, or memories with everyone!"}
            </p>
            {isFiltered ? (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E0D4] text-[#714B67] font-semibold text-[13px] hover:bg-[#F1EDE6] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#714B67] text-white hover:bg-[#4E3347] font-semibold text-[14px] transition-colors cursor-pointer"
              >
                Create the First Post
              </button>
            )}
          </div>
        ) : groupBy === "user" && groupedByUser ? (
          /* ── Grouped by User Feed ── */
          <div className="space-y-8">
            {groupedByUser.map((group) => {
              const authorName = `${group.user?.firstName || "Anonymous"} ${group.user?.lastName || ""}`.trim();
              return (
                <section key={group.userId} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#E7E0D4]">
                    <div className="w-8 h-8 rounded-full bg-[#F1E7EE] flex items-center justify-center text-[#714B67] font-bold text-xs">
                      {group.user?.firstName?.[0] || "U"}
                    </div>
                    <div>
                      <h3 className={`text-[16px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                        {authorName}
                      </h3>
                    </div>
                    <span className="text-[12px] font-mono text-[#9A93A6] ml-auto">
                      {group.posts.length} {group.posts.length === 1 ? "post" : "posts"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {group.posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={currentUser?.id}
                        onPostDeleted={handlePostDeleted}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : groupBy === "date" && groupedByDate ? (
          /* ── Grouped by Date Feed ── */
          <div className="space-y-8">
            {groupedByDate.map((group) => (
              <section key={group.label} className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-[#E7E0D4]">
                  <h3 className={`text-[16px] font-bold text-[#714B67] ${spaceGrotesk.className}`}>
                    {group.label}
                  </h3>
                  <span className="text-[12px] font-mono text-[#9A93A6] ml-auto">
                    {group.posts.length} {group.posts.length === 1 ? "post" : "posts"}
                  </span>
                </div>

                <div className="space-y-4">
                  {group.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUser?.id}
                      onPostDeleted={handlePostDeleted}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* ── Standard Flat Feed ── */
          <div className="space-y-4">
            {processedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onPostDeleted={handlePostDeleted}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Create Post Modal ── */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
