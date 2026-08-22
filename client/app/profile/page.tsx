"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import cookies from "js-cookie";

import { getMe } from "@/src/libs/interaction/dataGetter";
import { patchMe } from "@/src/libs/interaction/dataPatcher";
import { useToast } from "@/src/hooks/useToast";
import { User, UpdateProfilePayload } from "@/src/libs/types";

/* ── Fonts ─────────────────────────────────── */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"] });

/* ── Shared styles (mirrors auth page) ─────── */
const inputCls =
  "w-full bg-[#F1EDE6] border border-transparent rounded-lg px-3 py-2 " +
  "text-[13px] text-[#241B2F] outline-none " +
  "placeholder:text-[#9A93A6] " +
  "transition-[border-color,box-shadow,background] duration-150 " +
  "hover:border-[#D6CCBC] " +
  "focus:border-[#714B67] focus:shadow-[0_0_0_3px_#F1E7EE] focus:bg-white";

const inputDisabledCls =
  "w-full bg-[#F7F5F2] border border-transparent rounded-lg px-3 py-2 " +
  "text-[13px] text-[#9A93A6] outline-none cursor-not-allowed";

const inputErrorCls =
  "w-full bg-[#F1EDE6] border border-red-300 rounded-lg px-3 py-2 " +
  "text-[13px] text-[#241B2F] outline-none " +
  "placeholder:text-[#9A93A6] " +
  "transition-[border-color,box-shadow,background] duration-150 " +
  "focus:border-red-400 focus:shadow-[0_0_0_3px_#fee2e2] focus:bg-white";

/* ── Profile edit form schema ─────────────── */
type ProfileFormSchema = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  country: string;
  bio: string;
};

/* ── Placeholder trip data ─────────────────── */
const preplannedTrips = [
  { id: "pt1", name: "Japan Cherry Blossom",  dates: "Mar 2026", cover: "/dest_tokyo.png",     status: "Planning"  },
  { id: "pt2", name: "Mediterranean Cruise",  dates: "Jul 2026", cover: "/dest_santorini.png", status: "Upcoming"  },
  { id: "pt3", name: "NYC Long Weekend",       dates: "Oct 2026", cover: "/dest_newyork.png",   status: "Draft"     },
];

const previousTrips = [
  { id: "prev1", name: "Grand Europe Tour",   dates: "Jun–Jul 2025", cover: "/trip_europe.png",   budget: "$4,240" },
  { id: "prev2", name: "Southeast Asia Loop", dates: "Jan–Feb 2025", cover: "/trip_asia.png",     budget: "$2,180" },
  { id: "prev3", name: "Andes & Patagonia",   dates: "Nov 2024",     cover: "/trip_americas.png", budget: "$3,670" },
];

/* ══════════════════════════════════════════
   Page component
   ══════════════════════════════════════════ */
export default function ProfilePage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const { toast } = useToast();

  /* ── Fetch current user ─────────────────── */
  const { data: meRes, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn:  getMe,
    retry: false,
  });

  const user: User | null = meRes?.data?.user ?? null;

  /* ── Redirect if not logged in ──────────── */
  useEffect(() => {
    if (!isLoading && (isError || !meRes?.success)) {
      router.push("/auth");
    }
  }, [isLoading, isError, meRes, router]);

  if (isLoading) return <ProfileSkeleton />;
  if (!user)     return null; // redirecting

  return (
    <ProfileContent
      user={user}
      toast={toast}
      qc={qc}
      router={router}
    />
  );
}

/* ══════════════════════════════════════════
   Profile content (receives hydrated user)
   ══════════════════════════════════════════ */
function ProfileContent({
  user,
  toast,
  qc,
  router,
}: {
  user: User;
  toast: ReturnType<typeof useToast>["toast"];
  qc: ReturnType<typeof useQueryClient>;
  router: ReturnType<typeof useRouter>;
}) {
  const [editing, setEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.profilePhoto);
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormSchema>({
    defaultValues: {
      firstName:   user.firstName,
      lastName:    user.lastName,
      email:       user.email,
      phoneNumber: user.phoneNumber ?? "",
      city:        user.city        ?? "",
      country:     user.country     ?? "",
      bio:         user.bio         ?? "",
    },
  });

  /* ── Update profile mutation ─────────────── */
  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => patchMe(payload),
    onSuccess(res) {
      if (res?.success) {
        qc.invalidateQueries({ queryKey: ["me"] });
        toast({ title: "Profile updated", description: "Your changes have been saved." });
        setEditing(false);
        setPhotoFile(null);
      } else {
        toast({
          title: "Update failed",
          description: res?.message ?? "Something went wrong.",
          variant: "destructive",
        });
      }
    },
    onError(err: Error) {
      toast({ title: "Network error", description: err.message, variant: "destructive" });
    },
  });

  /* ── Handlers ────────────────────────────── */
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onSubmit(fields: ProfileFormSchema) {
    const payload: UpdateProfilePayload = {
      firstName:   fields.firstName   || undefined,
      lastName:    fields.lastName    || undefined,
      email:       fields.email       || undefined,
      phoneNumber: fields.phoneNumber || undefined,
      city:        fields.city        || undefined,
      country:     fields.country     || undefined,
      bio:         fields.bio         || undefined,
    };
    if (photoFile) payload.profilePhoto = photoFile;
    saveProfile(payload);
  }

  function cancelEdit() {
    reset();
    setPhotoPreview(user.profilePhoto);
    setPhotoFile(null);
    setEditing(false);
  }

  function handleLogout() {
    cookies.remove("token");
    router.push("/auth");
  }

  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");

  return (
    <div className={`min-h-screen bg-[#FAF8F5] ${inter.className}`}>

      {/* ── Nav ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5] border-b border-[#E7E0D4]">
        <div className="max-w-[1120px] mx-auto px-12 h-[60px] flex items-center justify-between">
          {/* Logo */}
          <button
            id="nav-logo"
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 cursor-pointer outline-none
              focus-visible:shadow-[0_0_0_3px_#F1E7EE] rounded"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="7"  cy="14" r="5" fill="#714B67" />
              <line x1="12" y1="14" x2="16" y2="14" stroke="#E0663D"
                strokeWidth="2" strokeDasharray="2 2"/>
              <circle cx="21" cy="14" r="5" stroke="#9A93A6"
                strokeWidth="2" fill="none"/>
            </svg>
            <span className={`text-[20px] font-bold tracking-tight text-[#241B2F] ${spaceGrotesk.className}`}>
              Globe<span className="text-[#714B67]">Trotter</span>
            </span>
          </button>

          {/* Right nav */}
          <div className="flex items-center gap-3">
            <button
              id="nav-logout"
              onClick={handleLogout}
              className="text-[13px] font-medium text-[#5C5468] px-3 py-1.5
                rounded-lg border border-[#E7E0D4] hover:border-[#D6CCBC]
                hover:text-[#241B2F] transition-colors duration-150 cursor-pointer
                outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────── */}
      <main className="max-w-[1120px] mx-auto px-12 py-8"
        style={{ animation: "fadeRise 200ms ease-out" }}>

        {/* ════════════════════════════════════
            Section 1 — User details card
            ════════════════════════════════════ */}
        <section
          id="profile-details"
          className="bg-white rounded-[14px] border border-[#E7E0D4]
            shadow-[0_1px_2px_rgba(36,27,47,0.04),_0_8px_24px_rgba(36,27,47,0.06)]
            p-8 mb-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex gap-8 items-start">

              {/* ── Avatar column ─────────────── */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="relative group">
                  {/* Circle avatar */}
                  <div
                    className={[
                      "w-[120px] h-[120px] rounded-full overflow-hidden",
                      "border-2 border-[#E7E0D4] bg-[#F1E7EE]",
                      "flex items-center justify-center",
                      editing ? "cursor-pointer group-hover:border-[#714B67] transition-colors duration-150" : "",
                    ].join(" ")}
                    onClick={() => editing && fileInputRef.current?.click()}
                    role={editing ? "button" : undefined}
                    aria-label={editing ? "Change profile photo" : "Profile photo"}
                  >
                    {photoPreview ? (
                      <Image
                        src={photoPreview}
                        alt="Profile photo"
                        width={120}
                        height={120}
                        className="object-cover w-full h-full"
                        unoptimized={photoPreview.startsWith("blob:")}
                      />
                    ) : (
                      <span className={`text-3xl font-bold text-[#714B67] ${spaceGrotesk.className}`}>
                        {initials || "GT"}
                      </span>
                    )}
                    {/* Hover overlay in edit mode */}
                    {editing && (
                      <div className="absolute inset-0 rounded-full bg-[#714B67]/70
                        opacity-0 group-hover:opacity-100 transition-opacity duration-150
                        flex items-center justify-center">
                        <div className="text-center">
                          <svg className="mx-auto mb-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M14 3l3 3-10 10H4v-3L14 3z" stroke="white" strokeWidth="1.5"
                              strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-white text-[11px] font-semibold">Change</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    id="profile-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPhotoChange}
                  />
                </div>

                {/* Name under avatar */}
                <div className="text-center">
                  <p className={`text-[15px] font-semibold text-[#241B2F] ${spaceGrotesk.className}`}>
                    {user.firstName} {user.lastName}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-medium text-[#714B67]
                    bg-[#F1E7EE] px-2.5 py-0.5 rounded-full">
                    {user.role === "ADMIN" ? "Admin" : "Traveller"}
                  </span>
                </div>

                {/* Member since */}
                <p className={`text-[11px] text-[#9A93A6] ${ibmPlexMono.className}`}>
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year:  "numeric",
                  })}
                </p>
              </div>

              {/* ── Details column ─────────────── */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center justify-between mb-5">
                  <h1 className={`text-[22px] font-semibold text-[#241B2F] ${spaceGrotesk.className}`}>
                    User details
                  </h1>
                  <div className="flex gap-2">
                    {editing ? (
                      <>
                        <button
                          id="profile-cancel-btn"
                          type="button"
                          onClick={cancelEdit}
                          className="h-9 px-4 text-[13px] font-medium text-[#5C5468]
                            border border-[#E7E0D4] rounded-lg
                            hover:border-[#D6CCBC] hover:text-[#241B2F]
                            transition-colors duration-150 cursor-pointer
                            outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
                        >
                          Cancel
                        </button>
                        <button
                          id="profile-save-btn"
                          type="submit"
                          disabled={isPending || (!isDirty && !photoFile)}
                          className="h-9 px-5 text-[13px] font-semibold text-white
                            bg-[#714B67] hover:bg-[#4E3347] active:scale-[0.98]
                            rounded-lg transition-all duration-150 cursor-pointer
                            outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]
                            disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isPending ? "Saving…" : "Save changes"}
                        </button>
                      </>
                    ) : (
                      <button
                        id="profile-edit-btn"
                        type="button"
                        onClick={() => setEditing(true)}
                        className="h-9 px-5 text-[13px] font-semibold text-[#714B67]
                          border border-[#714B67] rounded-lg
                          hover:bg-mulberry-tint active:scale-[0.98]
                          transition-all duration-150 cursor-pointer
                          outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]
                          flex items-center gap-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2l2.5 2.5L4.5 12H2V9.5L9.5 2z"
                            stroke="currentColor" strokeWidth="1.4"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Edit profile
                      </button>
                    )}
                  </div>
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <ProfileField
                    label="First name"
                    htmlFor="pf-firstname"
                    error={errors.firstName?.message}
                  >
                    <input
                      id="pf-firstname"
                      type="text"
                      disabled={!editing}
                      placeholder="Priya"
                      className={
                        !editing
                          ? inputDisabledCls
                          : errors.firstName
                          ? inputErrorCls
                          : inputCls
                      }
                      {...register("firstName", { required: "Required" })}
                    />
                  </ProfileField>

                  <ProfileField
                    label="Last name"
                    htmlFor="pf-lastname"
                    error={errors.lastName?.message}
                  >
                    <input
                      id="pf-lastname"
                      type="text"
                      disabled={!editing}
                      placeholder="Sharma"
                      className={
                        !editing
                          ? inputDisabledCls
                          : errors.lastName
                          ? inputErrorCls
                          : inputCls
                      }
                      {...register("lastName", { required: "Required" })}
                    />
                  </ProfileField>

                  <ProfileField
                    label="Email address"
                    htmlFor="pf-email"
                    error={errors.email?.message}
                  >
                    <input
                      id="pf-email"
                      type="email"
                      disabled={!editing}
                      placeholder="priya@example.com"
                      className={
                        !editing
                          ? inputDisabledCls
                          : errors.email
                          ? inputErrorCls
                          : inputCls
                      }
                      {...register("email", {
                        required: "Required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email",
                        },
                      })}
                    />
                  </ProfileField>

                  <ProfileField
                    label="Phone number"
                    htmlFor="pf-phone"
                    error={errors.phoneNumber?.message}
                  >
                    <input
                      id="pf-phone"
                      type="tel"
                      disabled={!editing}
                      placeholder="+91 98765 43210"
                      className={!editing ? inputDisabledCls : inputCls}
                      {...register("phoneNumber")}
                    />
                  </ProfileField>

                  <ProfileField
                    label="City"
                    htmlFor="pf-city"
                    error={errors.city?.message}
                  >
                    <input
                      id="pf-city"
                      type="text"
                      disabled={!editing}
                      placeholder="Mumbai"
                      className={!editing ? inputDisabledCls : inputCls}
                      {...register("city")}
                    />
                  </ProfileField>

                  <ProfileField
                    label="Country"
                    htmlFor="pf-country"
                    error={errors.country?.message}
                  >
                    <input
                      id="pf-country"
                      type="text"
                      disabled={!editing}
                      placeholder="India"
                      className={!editing ? inputDisabledCls : inputCls}
                      {...register("country")}
                    />
                  </ProfileField>

                  {/* Bio — full width */}
                  <ProfileField
                    label="About me"
                    htmlFor="pf-bio"
                    className="col-span-2"
                  >
                    <textarea
                      id="pf-bio"
                      disabled={!editing}
                      placeholder="Tell us about your travel style, favourite destinations…"
                      className={`${!editing ? inputDisabledCls : inputCls} resize-none min-h-[68px]`}
                      {...register("bio")}
                    />
                  </ProfileField>
                </div>
              </div>
            </div>
          </form>
        </section>

        {/* ════════════════════════════════════
            Section 2 — Preplanned Trips
            ════════════════════════════════════ */}
        <section id="preplanned-trips" className="mb-8">
          <SectionHeader title="Preplanned Trips" />
          <div className="grid grid-cols-3 gap-5">
            {preplannedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                id={trip.id}
                name={trip.name}
                dates={trip.dates}
                cover={trip.cover}
                badge={trip.status}
                badgeColor={
                  trip.status === "Planning" ? "mulberry"
                  : trip.status === "Upcoming" ? "horizon"
                  : "sun"
                }
              />
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════
            Section 3 — Previous Trips
            ════════════════════════════════════ */}
        <section id="previous-trips" className="mb-8">
          <SectionHeader title="Previous Trips" />
          <div className="grid grid-cols-3 gap-5">
            {previousTrips.map((trip) => (
              <TripCard
                key={trip.id}
                id={trip.id}
                name={trip.name}
                dates={trip.dates}
                cover={trip.cover}
                badge="Completed"
                badgeColor="horizon"
                extraMono={trip.budget}
              />
            ))}
          </div>
        </section>

      </main>

      <style>{`
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════ */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <h2 className={`text-[22px] font-semibold text-[#241B2F] whitespace-nowrap ${spaceGrotesk.className}`}>
        {title}
      </h2>
      <div className="flex-1 h-px bg-[#E7E0D4]" />
    </div>
  );
}

function ProfileField({
  label,
  htmlFor,
  error,
  className: cls = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${cls}`}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold text-[#5C5468] uppercase tracking-[0.4px]"
      >
        {label}
      </label>
      {children}
      {error && (
        <span className="text-[11px] text-red-500 leading-tight">{error}</span>
      )}
    </div>
  );
}

const badgePalette = {
  mulberry: { bg: "#F1E7EE", text: "#714B67", border: "#714B67" },
  horizon:  { bg: "rgba(47,122,111,0.10)", text: "#2F7A6F", border: "#2F7A6F" },
  sun:      { bg: "rgba(239,169,40,0.12)",  text: "#C88400", border: "#EFA928" },
};

function TripCard({
  id,
  name,
  dates,
  cover,
  badge,
  badgeColor,
  extraMono,
}: {
  id: string;
  name: string;
  dates: string;
  cover: string;
  badge: string;
  badgeColor: keyof typeof badgePalette;
  extraMono?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const bc = badgePalette[badgeColor];
  const ibm = ibmPlexMono;
  const sg  = spaceGrotesk;

  return (
    <article
      id={`trip-card-${id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-[14px] border border-[#E7E0D4] overflow-hidden cursor-pointer"
      style={{
        boxShadow: hovered
          ? "0 4px 12px rgba(36,27,47,0.10)"
          : "0 1px 2px rgba(36,27,47,0.04), 0 8px 24px rgba(36,27,47,0.06)",
        transform:  hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "box-shadow 150ms, transform 150ms",
      }}
    >
      {/* Cover image */}
      <div className="relative h-[160px] overflow-hidden">
        <Image
          src={cover}
          alt={name}
          fill
          sizes="(max-width: 1120px) 35vw, 350px"
          className="object-cover"
          style={{
            filter: hovered ? "brightness(0.88)" : "brightness(1)",
            transition: "filter 150ms",
          }}
        />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(36,27,47,0.55)] to-transparent" />
        {/* Status badge */}
        <span
          className="absolute top-3 left-3 text-[11px] font-medium px-2.5 py-0.5 rounded-full border"
          style={{
            background:   bc.bg,
            color:        bc.text,
            borderColor:  bc.border,
            backdropFilter: "blur(4px)",
          }}
        >
          {badge}
        </span>
        {/* Trip name */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className={`text-[15px] font-semibold text-white leading-tight ${sg.className}`}>
            {name}
          </h3>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className={`text-[12px] text-[#5C5468] ${ibm.className}`}>{dates}</p>
        {extraMono && (
          <p className={`text-[12px] text-[#241B2F] font-medium ${ibm.className}`}>
            {extraMono}
          </p>
        )}
        <button
          id={`view-trip-${id}`}
          className="text-[12px] font-medium text-[#714B67] border border-[#714B67]
            px-3 py-1 rounded-lg hover:bg-[#F1E7EE] transition-colors duration-150
            cursor-pointer outline-none focus-visible:shadow-[0_0_0_3px_#F1E7EE]"
        >
          View
        </button>
      </div>
    </article>
  );
}

/* ── Loading skeleton ───────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="h-[60px] bg-white border-b border-[#E7E0D4]" />
      <div className="max-w-[1120px] mx-auto px-12 py-8">
        <div
          className="bg-white rounded-[14px] border border-[#E7E0D4] p-8 mb-8"
          style={{ animation: "pulse 1.5s ease-in-out infinite" }}
        >
          <div className="flex gap-8">
            {/* Avatar skeleton */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="w-[120px] h-[120px] rounded-full bg-[#F1EDE6]" />
              <div className="w-24 h-3 bg-[#F1EDE6] rounded-full" />
              <div className="w-16 h-2 bg-[#F1EDE6] rounded-full" />
            </div>
            {/* Fields skeleton */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-2 w-16 bg-[#F1EDE6] rounded-full" />
                  <div className="h-9 bg-[#F1EDE6] rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Trip skeletons */}
        {[0, 1].map((s) => (
          <div key={s} className="mb-8">
            <div className="h-4 w-40 bg-[#F1EDE6] rounded-full mb-5" />
            <div className="grid grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[220px] bg-[#F1EDE6] rounded-[14px]"
                  style={{ animation: "pulse 1.5s ease-in-out infinite" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
