"use client";

import React, { useState } from "react";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });

interface PostImageProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "auto" | "wide";
}

export function PostImage({
  src,
  alt = "Post image",
  caption,
  className = "",
  aspectRatio = "video",
}: PostImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!src || hasError) return null;

  const aspectRatioClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "wide"
      ? "aspect-[21/9]"
      : aspectRatio === "video"
      ? "aspect-[16/9]"
      : "max-h-[400px]";

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => (prev === 1 ? 1.75 : 1));
  };

  const closeModal = () => {
    setIsOpen(false);
    setZoomLevel(1);
  };

  return (
    <>
      {/* ── Main Post Image Card ── */}
      <div
        onClick={() => setIsOpen(true)}
        className={`relative overflow-hidden rounded-xl border border-[#E7E0D4] bg-[#F1EDE6] group cursor-pointer transition-all duration-200 hover:border-[#714B67]/40 hover:shadow-md ${aspectRatioClass} ${className}`}
        role="button"
        tabIndex={0}
        aria-label="Click to enlarge image"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#F1EDE6] animate-pulse flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#D6CCBC] animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}

        {/* Thumbnail Image */}
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Hover Zoom Overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-3">
          <div className="bg-white/95 backdrop-blur-md text-[#241B2F] px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <span>Click to expand</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Lightbox Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={closeModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeModal();
          }}
          tabIndex={-1}
        >
          {/* Top action bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white/90 mb-3 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate max-w-md ${spaceGrotesk.className}`}>
                {caption || alt}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom toggle */}
              <button
                type="button"
                onClick={toggleZoom}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                title={zoomLevel > 1 ? "Zoom Out" : "Zoom In"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  {zoomLevel > 1 ? (
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  ) : (
                    <>
                      <line x1="11" y1="8" x2="11" y2="14"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </>
                  )}
                </svg>
                <span>{zoomLevel > 1 ? "Reset Zoom" : "Zoom In"}</span>
              </button>

              {/* Download / Open image */}
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Open original"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Original</span>
              </a>

              {/* Close button */}
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                aria-label="Close lightbox"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div
            className="relative max-w-5xl max-h-[82vh] w-full flex items-center justify-center overflow-auto rounded-2xl p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              style={{
                transform: `scale(${zoomLevel})`,
                cursor: zoomLevel > 1 ? "zoom-out" : "zoom-in",
              }}
              onClick={toggleZoom}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl transition-transform duration-200 select-none"
            />
          </div>

          {/* Bottom caption if exists */}
          {caption && (
            <p
              className={`mt-2 text-center text-xs text-white/70 max-w-xl truncate ${inter.className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
