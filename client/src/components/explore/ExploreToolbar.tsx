"use client";

import React, { useState, useRef, useEffect } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import {
  GroupByOption,
  SortByOption,
  PostTypeFilter,
  AuthorFilter,
  DateRangeFilter,
} from "@/src/libs/types";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });

interface ExploreToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  groupBy: GroupByOption;
  onGroupByChange: (val: GroupByOption) => void;
  sortBy: SortByOption;
  onSortByChange: (val: SortByOption) => void;
  postTypeFilter: PostTypeFilter;
  onPostTypeFilterChange: (val: PostTypeFilter) => void;
  authorFilter: AuthorFilter;
  onAuthorFilterChange: (val: AuthorFilter) => void;
  dateRangeFilter: DateRangeFilter;
  onDateRangeFilterChange: (val: DateRangeFilter) => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export function ExploreToolbar({
  searchQuery,
  onSearchChange,
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
  postTypeFilter,
  onPostTypeFilterChange,
  authorFilter,
  onAuthorFilterChange,
  dateRangeFilter,
  onDateRangeFilterChange,
  onResetFilters,
  isFiltered,
}: ExploreToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) {
        setIsGroupOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortLabels: Record<SortByOption, string> = {
    createdAt: "Newest first",
    likeCount: "Most liked",
    updatedAt: "Recently updated",
    title: "Title (A-Z)",
  };

  const groupLabels: Record<GroupByOption, string> = {
    none: "No Grouping",
    user: "Group by User",
    date: "Group by Date",
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-[#E7E0D4] p-3 sm:p-4 shadow-[0_1px_2px_rgba(36,27,47,0.04),0_8px_24px_rgba(36,27,47,0.06)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      {/* ── 1. Search Bar for Activity / Title / User ── */}
      <div className="relative flex-1 min-w-[240px]">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9A93A6]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search activity by title, story, or author..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#E7E0D4] bg-[#FAF8F5] text-[#241B2F] placeholder-[#9A93A6] text-[14px] focus:outline-none focus:border-[#714B67] focus:bg-white focus:ring-2 focus:ring-[#F1E7EE] transition-all ${inter.className}`}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9A93A6] hover:text-[#241B2F] cursor-pointer"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── 2. Toolbar Actions: Group By, Filter, Sort By ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* ── Group By Dropdown ── */}
        <div className="relative" ref={groupRef}>
          <button
            type="button"
            onClick={() => {
              setIsGroupOpen(!isGroupOpen);
              setIsFilterOpen(false);
              setIsSortOpen(false);
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-[13.5px] font-medium flex items-center gap-2 transition-all cursor-pointer ${
              groupBy !== "none"
                ? "bg-[#F1E7EE] border-[#714B67] text-[#714B67] font-semibold"
                : "bg-[#FAF8F5] border-[#E7E0D4] text-[#5C5468] hover:bg-[#F1EDE6] hover:text-[#241B2F]"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>{groupLabels[groupBy]}</span>
            <span className="text-[10px] text-[#9A93A6]">▼</span>
          </button>

          {isGroupOpen && (
            <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-48 bg-white rounded-xl border border-[#E7E0D4] shadow-[0_4px_16px_rgba(36,27,47,0.12)] py-1.5 z-40 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  onGroupByChange("none");
                  setIsGroupOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-[13px] flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                  groupBy === "none" ? "font-semibold text-[#714B67] bg-[#F1E7EE]/50" : "text-[#241B2F]"
                }`}
              >
                <span>No Grouping</span>
                {groupBy === "none" && <span>✓</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  onGroupByChange("user");
                  setIsGroupOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-[13px] flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                  groupBy === "user" ? "font-semibold text-[#714B67] bg-[#F1E7EE]/50" : "text-[#241B2F]"
                }`}
              >
                <span>Group by User</span>
                {groupBy === "user" && <span>✓</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  onGroupByChange("date");
                  setIsGroupOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-[13px] flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                  groupBy === "date" ? "font-semibold text-[#714B67] bg-[#F1E7EE]/50" : "text-[#241B2F]"
                }`}
              >
                <span>Group by Date</span>
                {groupBy === "date" && <span>✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* ── Filter Popover ── */}
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => {
              setIsFilterOpen(!isFilterOpen);
              setIsGroupOpen(false);
              setIsSortOpen(false);
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-[13.5px] font-medium flex items-center gap-2 transition-all cursor-pointer relative ${
              isFiltered
                ? "bg-[#F1E7EE] border-[#714B67] text-[#714B67] font-semibold"
                : "bg-[#FAF8F5] border-[#E7E0D4] text-[#5C5468] hover:bg-[#F1EDE6] hover:text-[#241B2F]"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filter</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-[#E0663D]"></span>
            )}
            <span className="text-[10px] text-[#9A93A6]">▼</span>
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-[#E7E0D4] shadow-[0_4px_20px_rgba(36,27,47,0.15)] p-4 z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D4] mb-3">
                <span className={`text-[14px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
                  Filter Feed
                </span>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-[12px] font-medium text-[#714B67] hover:underline cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
              </div>

              {/* Post Type Filter */}
              <div className="mb-3.5">
                <span className="block text-[12px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1.5">
                  Post Type
                </span>
                <div className="grid grid-cols-3 gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E7E0D4]">
                  {[
                    { id: "all", label: "All" },
                    { id: "images", label: "Photos" },
                    { id: "trips", label: "Trips" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onPostTypeFilterChange(tab.id as PostTypeFilter)}
                      className={`text-[12px] py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        postTypeFilter === tab.id
                          ? "bg-white text-[#714B67] font-semibold shadow-xs"
                          : "text-[#5C5468] hover:text-[#241B2F]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author Filter */}
              <div className="mb-3.5">
                <span className="block text-[12px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1.5">
                  Author
                </span>
                <div className="grid grid-cols-2 gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E7E0D4]">
                  {[
                    { id: "all", label: "All Users" },
                    { id: "me", label: "My Posts" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onAuthorFilterChange(tab.id as AuthorFilter)}
                      className={`text-[12px] py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        authorFilter === tab.id
                          ? "bg-white text-[#714B67] font-semibold shadow-xs"
                          : "text-[#5C5468] hover:text-[#241B2F]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <span className="block text-[12px] font-semibold text-[#5C5468] uppercase tracking-wider mb-1.5">
                  Time Period
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "week", label: "This Week" },
                    { id: "month", label: "This Month" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onDateRangeFilterChange(opt.id as DateRangeFilter)}
                      className={`text-[12px] px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                        dateRangeFilter === opt.id
                          ? "border-[#714B67] bg-[#F1E7EE] text-[#714B67] font-semibold"
                          : "border-[#E7E0D4] bg-white text-[#5C5468] hover:border-[#D6CCBC] hover:text-[#241B2F]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sort By Dropdown ── */}
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => {
              setIsSortOpen(!isSortOpen);
              setIsFilterOpen(false);
              setIsGroupOpen(false);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-[#E7E0D4] bg-[#FAF8F5] text-[#5C5468] hover:bg-[#F1EDE6] hover:text-[#241B2F] text-[13.5px] font-medium flex items-center gap-2 transition-all cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            <span>{sortLabels[sortBy]}</span>
            <span className="text-[10px] text-[#9A93A6]">▼</span>
          </button>

          {isSortOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#E7E0D4] shadow-[0_4px_16px_rgba(36,27,47,0.12)] py-1.5 z-40 animate-in fade-in zoom-in-95">
              {(
                [
                  { id: "createdAt", label: "Newest first" },
                  { id: "likeCount", label: "Most liked" },
                  { id: "updatedAt", label: "Recently updated" },
                  { id: "title", label: "Title (A-Z)" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSortByChange(item.id);
                    setIsSortOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-[13px] flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                    sortBy === item.id ? "font-semibold text-[#714B67] bg-[#F1E7EE]/50" : "text-[#241B2F]"
                  }`}
                >
                  <span>{item.label}</span>
                  {sortBy === item.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
