"use client";

import React, { useState, useEffect, useRef } from "react";
import { Space_Grotesk, Inter } from "next/font/google";
import { createCommunityPost } from "@/src/libs/interaction/dataPoster";
import { getUserTrips } from "@/src/libs/interaction/dataGetter";
import { Trip, CommunityPost } from "@/src/libs/types";
import { toast } from "@/src/hooks/useToast";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: CommunityPost) => void;
}

export function CreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState<boolean>(false);

  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch user's trips for the optional trip picker
      setLoadingTrips(true);
      getUserTrips()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setUserTrips(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingTrips(false));
    } else {
      // Reset form when modal closes
      setTitle("");
      setContent("");
      setSelectedTripId("");
      handleRemoveImage();
    }
  }, [isOpen]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, WEBP, etc.).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size should be less than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Title is required",
        description: "Please provide a title for your post.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Content is required",
        description: "Please write some details for your community post.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      if (selectedTripId) {
        formData.append("tripId", selectedTripId);
      }
      if (imageFile) {
        formData.append("imageUrl", imageFile);
      }

      const res = await createCommunityPost(formData);

      if (res?.success && res.data) {
        toast({
          title: "Post created! 🎉",
          description: "Your story is now live in the community explore feed.",
        });
        onPostCreated(res.data);
        onClose();
      } else {
        toast({
          title: "Failed to publish post",
          description: res?.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error publishing post",
        description: err.message || "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] w-full max-w-[520px] max-h-[92vh] flex flex-col rounded-2xl border border-[#E7E0D4] shadow-[0_4px_24px_rgba(36,27,47,0.15)] overflow-hidden my-auto animate-[cardIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7E0D4] bg-white shrink-0">
          <div>
            <h2 className={`text-[17px] font-bold text-[#241B2F] ${spaceGrotesk.className}`}>
              Create Community Post
            </h2>
            <p className="text-[12px] text-[#5C5468]">
              Share travel tips, stories, and recommendations with explorers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#9A93A6] hover:text-[#241B2F] hover:bg-[#F1EDE6] transition-colors cursor-pointer text-sm"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Body / Form ── */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {/* Post Title */}
          <div>
            <label className={`block text-[12px] font-semibold text-[#241B2F] mb-1 ${inter.className}`}>
              Post Title <span className="text-[#E0663D]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Hidden gems in Kyoto you must visit!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E7E0D4] bg-white text-[#241B2F] placeholder-[#9A93A6] text-[13.5px] focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#F1E7EE] transition-all"
              maxLength={120}
              required
            />
          </div>

          {/* Post Content */}
          <div>
            <label className={`block text-[12px] font-semibold text-[#241B2F] mb-1 ${inter.className}`}>
              Content <span className="text-[#E0663D]">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Share details, food spots, tips, budget advice, or highlights..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E7E0D4] bg-white text-[#241B2F] placeholder-[#9A93A6] text-[13.5px] focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#F1E7EE] transition-all resize-none"
              required
            />
          </div>

          {/* Photo File Upload (Compact Preview) */}
          <div>
            <label className={`block text-[12px] font-semibold text-[#241B2F] mb-1 ${inter.className}`}>
              Attach Photo <span className="text-[11px] font-normal text-[#9A93A6]">(Optional)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {imagePreviewUrl ? (
              <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-[#E7E0D4]">
                <div className="w-13 h-13 rounded-lg overflow-hidden border border-[#E7E0D4] bg-[#F1EDE6] shrink-0">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#241B2F] truncate">
                    {imageFile ? imageFile.name : "Attached Image"}
                  </p>
                  <p className="text-[11px] text-[#9A93A6]">
                    {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : "Ready to upload"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[11.5px] font-medium text-[#714B67] bg-[#F1E7EE] hover:bg-[#E7D6E2] rounded-lg transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-2.5 py-1 text-[11.5px] font-medium text-[#C0392B] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl py-2.5 px-3 text-center cursor-pointer transition-all flex items-center justify-center gap-2.5 ${
                  isDragging
                    ? "border-[#714B67] bg-[#F1E7EE]/50"
                    : "border-[#D6CCBC] bg-white hover:bg-[#F1EDE6]/40 hover:border-[#714B67]/60"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#F1E7EE] text-[#714B67] flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <div className="text-left text-[12px]">
                  <span className="text-[#714B67] font-semibold underline">Click to upload photo</span>
                  <span className="text-[#5C5468]"> or drag & drop</span>
                  <span className="text-[#9A93A6] text-[11px] ml-1.5">(PNG, JPG up to 10MB)</span>
                </div>
              </div>
            )}
          </div>

          {/* Optional Linked Trip */}
          <div>
            <label className={`block text-[12px] font-semibold text-[#241B2F] mb-1 ${inter.className}`}>
              Link a Trip <span className="text-[11px] font-normal text-[#9A93A6]">(Optional)</span>
            </label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E7E0D4] bg-white text-[#241B2F] text-[13.5px] focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#F1E7EE] transition-all cursor-pointer"
            >
              <option value="">-- No trip linked --</option>
              {loadingTrips ? (
                <option disabled>Loading your trips...</option>
              ) : (
                userTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name} ({new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* ── Modal Footer Actions ── */}
          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-[#E7E0D4] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-[#5C5468] hover:bg-[#F1EDE6] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-[13.5px] font-semibold bg-[#714B67] text-white hover:bg-[#4E3347] shadow-sm transition-all duration-150 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish Post</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
