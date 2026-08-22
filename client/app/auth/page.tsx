"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import cookies from "js-cookie";

import { login, registerUser } from "@/src/libs/interaction/dataPoster";
import { useToast } from "@/src/hooks/useToast";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"] });

type Mode = "login" | "register";

/* ── Shared class strings ── */
const inputCls =
  "w-full bg-[#FAF8F5] border border-[#E7E0D4] rounded-lg px-3 py-2 " +
  "text-[13.5px] text-[#241B2F] outline-none " +
  "placeholder:text-[#9A93A6] " +
  "transition-[border-color,box-shadow,background] duration-150 " +
  "hover:border-[#D6CCBC] " +
  "focus:border-[#714B67] focus:shadow-[0_0_0_3px_#F1E7EE] focus:bg-white";

const inputErrorCls =
  "w-full bg-[#FAF8F5] border border-red-300 rounded-lg px-3 py-2 " +
  "text-[13.5px] text-[#241B2F] outline-none " +
  "placeholder:text-[#9A93A6] " +
  "transition-[border-color,box-shadow,background] duration-150 " +
  "focus:border-red-400 focus:shadow-[0_0_0_3px_#fee2e2] focus:bg-white";

const btnCls =
  "w-full mt-2 bg-[#714B67] hover:bg-[#4E3347] active:scale-[0.98] " +
  "text-white font-semibold text-[14px] rounded-lg py-2.5 cursor-pointer outline-none " +
  "transition-all duration-150 shadow-[0_2px_8px_rgba(113,75,103,0.25)] " +
  "hover:shadow-[0_4px_14px_rgba(113,75,103,0.35)] " +
  "focus-visible:shadow-[0_0_0_3px_#F1E7EE] " +
  "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";

/* ── Types ── */
type LoginSchema = { email: string; password: string };

type RegisterSchema = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  password: string;
  confirmPassword: string;
  additionalInfo?: string;
};

/* ─────────────────────────────────────────── */

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className={`min-h-screen flex bg-[#FAF8F5] ${inter.className}`}>
      {/* ── Left branding panel ── */}
      <aside className="hidden lg:flex flex-col justify-between flex-none w-[40%] min-h-screen bg-[#714B67] p-12 relative overflow-hidden sticky top-0 h-screen">
        {/* Decorative circles */}
        <div className="absolute w-[480px] h-[480px] rounded-full bg-white/5 -top-[120px] -left-[120px] pointer-events-none" />
        <div className="absolute w-[320px] h-[320px] rounded-full bg-white/[0.04] -bottom-20 -right-20 pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-[38px] h-[38px] rounded-full border-2 border-white/40 flex items-center justify-center text-lg">
            🌐
          </div>
          <span className={`text-white text-xl font-bold tracking-tight ${spaceGrotesk.className}`}>
            GlobeTrotter
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <h1 className={`text-[36px] font-bold text-white leading-[1.2] tracking-tight mb-4 ${spaceGrotesk.className}`}>
            Plan every stop.<br />
            <span className="text-white/50">See the whole</span><br />
            journey.
          </h1>
          <p className="text-[14.5px] text-white/70 leading-relaxed max-w-[300px]">
            Multi-city trips, budgets, and itineraries — all connected in one living route.
          </p>

          {/* Route-line decoration */}
          <div className="mt-10">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white/90 shrink-0" />
              <RouteDash />
              <div className="w-2.5 h-2.5 rounded-full bg-white/90 shrink-0" />
              <RouteDash />
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white/40 shrink-0" />
            </div>
            <div className="flex justify-between mt-1.5 max-w-[220px]">
              {["BOM", "DXB", "CDG"].map((code) => (
                <span key={code} className={`text-[11px] text-white/40 tracking-wide ${ibmPlexMono.className}`}>
                  {code}
                </span>
              ))}
            </div>
          </div>
        </div>

        <span className={`relative z-10 text-[11px] text-white/30 tracking-wide ${ibmPlexMono.className}`}>
          Built for Odoo Hackathon 2026
        </span>
      </aside>

      {/* ── Right form panel (Scrollable) ── */}
      <main className="flex-1 min-h-screen overflow-y-auto flex flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-[500px] my-auto bg-white rounded-[24px] border border-[#E7E0D4] p-6 sm:p-8 shadow-[0_2px_8px_rgba(36,27,47,0.04),0_12px_32px_rgba(36,27,47,0.06)] animate-[cardIn_0.3s_ease-out]">
          
          {/* Tabs */}
          <div className="flex border-b border-[#E7E0D4] mb-6" role="tablist">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                id={`tab-${m}`}
                role="tab"
                aria-selected={mode === m}
                aria-controls={`panel-${m}`}
                onClick={() => setMode(m)}
                className={[
                  "flex-1 pb-3 text-[14.5px] relative outline-none cursor-pointer transition-colors duration-150 text-center",
                  "after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-full after:h-0.5",
                  "after:bg-[#714B67] after:transition-transform after:duration-200 after:ease-out",
                  "focus-visible:shadow-[0_0_0_3px_#F1E7EE]",
                  spaceGrotesk.className,
                  mode === m
                    ? "text-[#714B67] font-bold after:scale-x-100"
                    : "text-[#5C5468] font-medium after:scale-x-0 hover:text-[#241B2F]",
                ].join(" ")}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ── Login panel ── */}
          {mode === "login" && (
            <LoginPanel
              toast={toast}
              router={router}
              spaceGrotesk={spaceGrotesk.className}
              onSwitchMode={() => setMode("register")}
            />
          )}

          {/* ── Register panel ── */}
          {mode === "register" && (
            <RegisterPanel
              toast={toast}
              router={router}
              spaceGrotesk={spaceGrotesk.className}
              onSwitchMode={() => setMode("login")}
            />
          )}
        </div>
      </main>

      {/* Keyframe definitions */}
      <style>{`
        @keyframes cardIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes panelIn { from { opacity:0; transform:translateX(4px);  } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  );
}

/* ── Login Panel ── */

function LoginPanel({
  toast,
  router,
  spaceGrotesk,
  onSwitchMode,
}: {
  toast: ReturnType<typeof useToast>["toast"];
  router: ReturnType<typeof useRouter>;
  spaceGrotesk: string;
  onSwitchMode: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: login,
  });

  function onSubmit(data: LoginSchema) {
    mutate(data, {
      onSuccess(res) {
        if (res?.success) {
          cookies.set("token", res.data?.token ?? "", { expires: 7 });
          toast({ title: "Welcome back!", description: "Signed in successfully." });
          router.push("/");
        } else {
          toast({
            title: "Sign-in failed",
            description: res?.message ?? "Invalid credentials.",
            variant: "destructive",
          });
        }
      },
      onError(error) {
        toast({
          title: "Network error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div
      id="panel-login"
      role="tabpanel"
      aria-labelledby="tab-login"
      className="animate-[panelIn_0.22s_ease-out]"
    >
      <div className="mb-5">
        <h2 className={`text-[20px] font-bold text-[#241B2F] tracking-tight ${spaceGrotesk}`}>
          Welcome back
        </h2>
        <p className="text-[13px] text-[#5C5468] mt-0.5">
          Sign in to access your trips and community posts.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-3.5">
          <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              className={errors.email ? inputErrorCls : inputCls}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
              })}
            />
          </Field>

          <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
            <PasswordField
              id="login-password"
              placeholder="Enter your password"
              registration={register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" },
              })}
              hasError={!!errors.password}
            />
          </Field>
        </div>

        <button
          id="btn-login"
          type="submit"
          disabled={isPending}
          className={btnCls}
        >
          {isPending ? "Signing in…" : "Sign in to GlobeTrotter"}
        </button>
      </form>

      <p className="text-center text-[13px] text-[#5C5468] mt-4">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-[#714B67] font-semibold underline underline-offset-2 hover:text-[#4E3347] transition-colors outline-none cursor-pointer"
        >
          Create an account
        </button>
      </p>
    </div>
  );
}

/* ── Register Panel ── */

function RegisterPanel({
  toast,
  router,
  spaceGrotesk,
  onSwitchMode,
}: {
  toast: ReturnType<typeof useToast>["toast"];
  router: ReturnType<typeof useRouter>;
  spaceGrotesk: string;
  onSwitchMode: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<RegisterSchema>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      country: "",
      password: "",
      confirmPassword: "",
      additionalInfo: "",
    },
    mode: "onTouched",
  });

  const passwordValue = watch("password");

  const { mutate, isPending } = useMutation({
    mutationFn: registerUser,
  });

  const handlePhotoSelect = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile photo should be smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setProfilePhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setProfilePhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleNextStep = async () => {
    const isValid = await trigger(["firstName", "lastName", "email", "phone"]);
    if (isValid) {
      setStep(2);
    }
  };

  function onSubmit(data: RegisterSchema) {
    const formData = new FormData();
    formData.append("firstName", data.firstName.trim());
    formData.append("lastName", data.lastName.trim());
    formData.append("email", data.email.trim().toLowerCase());
    formData.append("password", data.password);
    if (data.phone) formData.append("phoneNumber", data.phone.trim());
    if (data.city) formData.append("city", data.city.trim());
    if (data.country) formData.append("country", data.country.trim());
    if (data.additionalInfo) formData.append("bio", data.additionalInfo.trim());

    if (profilePhoto) {
      formData.append("profilePhoto", profilePhoto);
    }

    mutate(formData, {
      onSuccess(res) {
        if (res?.success) {
          if (res.data?.token) {
            cookies.set("token", res.data.token, { expires: 7 });
          }
          toast({ title: "Account created!", description: "Welcome to GlobeTrotter 🌐" });
          router.push("/");
        } else {
          toast({
            title: "Registration failed",
            description: res?.message ?? "Something went wrong.",
            variant: "destructive",
          });
        }
      },
      onError(error) {
        toast({
          title: "Network error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div
      id="panel-register"
      role="tabpanel"
      aria-labelledby="tab-register"
      className="animate-[panelIn_0.22s_ease-out]"
    >
      {/* Header with Step Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-[19px] font-bold text-[#241B2F] tracking-tight ${spaceGrotesk}`}>
            Join GlobeTrotter
          </h2>
          <p className="text-[12.5px] text-[#5C5468] mt-0.5">
            {step === 1 ? "Step 1 of 2: Personal details" : "Step 2 of 2: Security & location"}
          </p>
        </div>

        {/* Stepper badge pills */}
        <div className="flex items-center gap-1.5 bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#E7E0D4]">
          <span
            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
              step === 1
                ? "bg-[#714B67] text-white shadow-sm"
                : "bg-[#EBDCE6] text-[#714B67]"
            }`}
          >
            1
          </span>
          <div
            className={`w-3.5 h-[2px] rounded-full transition-colors ${
              step === 2 ? "bg-[#714B67]" : "bg-[#E7E0D4]"
            }`}
          />
          <span
            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
              step === 2
                ? "bg-[#714B67] text-white shadow-sm"
                : "bg-[#F1E7EE] text-[#9A93A6]"
            }`}
          >
            2
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, (formErrors) => {
          // If errors exist in step 1 fields while on step 2, move back
          if (
            formErrors.firstName ||
            formErrors.lastName ||
            formErrors.email ||
            formErrors.phone
          ) {
            setStep(1);
          }
        })}
        noValidate
      >
        {/* ── STEP 1: Personal Info & Avatar ── */}
        {step === 1 && (
          <div className="animate-[panelIn_0.2s_ease-out] flex flex-col gap-3">
            {/* Profile Photo Uploader */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E0D4]">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-[#F1E7EE] border-2 border-[#E7E0D4] overflow-hidden flex items-center justify-center cursor-pointer hover:border-[#714B67] hover:scale-105 transition-all shrink-0 relative group"
                title="Click to upload profile photo"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base">📷</span>
                )}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-semibold">
                  Edit
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#241B2F]">Profile Photo</span>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[10.5px] text-[#C0392B] hover:underline cursor-pointer font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[10.5px] text-[#9A93A6] truncate">
                  {profilePhoto ? profilePhoto.name : "Optional • PNG, JPG or WEBP (Max 5MB)"}
                </p>
              </div>

              {!photoPreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#714B67] bg-[#F1E7EE] hover:bg-[#E7D6E2] rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Upload
                </button>
              )}
            </div>

            {/* First + Last */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="First name" htmlFor="reg-firstname" error={errors.firstName?.message}>
                <input
                  id="reg-firstname"
                  type="text"
                  placeholder="Priya"
                  autoComplete="given-name"
                  className={errors.firstName ? inputErrorCls : inputCls}
                  {...register("firstName", { required: "First name required" })}
                />
              </Field>
              <Field label="Last name" htmlFor="reg-lastname" error={errors.lastName?.message}>
                <input
                  id="reg-lastname"
                  type="text"
                  placeholder="Sharma"
                  autoComplete="family-name"
                  className={errors.lastName ? inputErrorCls : inputCls}
                  {...register("lastName", { required: "Last name required" })}
                />
              </Field>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Email" htmlFor="reg-email" error={errors.email?.message}>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="priya@example.com"
                  autoComplete="email"
                  className={errors.email ? inputErrorCls : inputCls}
                  {...register("email", {
                    required: "Email required",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                  })}
                />
              </Field>
              <Field label="Phone" htmlFor="reg-phone" error={errors.phone?.message}>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  className={errors.phone ? inputErrorCls : inputCls}
                  {...register("phone", { required: "Phone required" })}
                />
              </Field>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextStep}
              className={`${btnCls} flex items-center justify-center gap-2`}
            >
              <span>Next: Security & Location</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* ── STEP 2: Location, Password & Bio ── */}
        {step === 2 && (
          <div className="animate-[panelIn_0.2s_ease-out] flex flex-col gap-3">
            {/* City + Country */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="City" htmlFor="reg-city" error={errors.city?.message}>
                <input
                  id="reg-city"
                  type="text"
                  placeholder="Mumbai"
                  autoComplete="address-level2"
                  className={errors.city ? inputErrorCls : inputCls}
                  {...register("city", { required: "City required" })}
                />
              </Field>
              <Field label="Country" htmlFor="reg-country" error={errors.country?.message}>
                <input
                  id="reg-country"
                  type="text"
                  placeholder="India"
                  autoComplete="country-name"
                  className={errors.country ? inputErrorCls : inputCls}
                  {...register("country", { required: "Country required" })}
                />
              </Field>
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Password" htmlFor="reg-password" error={errors.password?.message}>
                <PasswordField
                  id="reg-password"
                  placeholder="Min. 8 chars"
                  autoComplete="new-password"
                  registration={register("password", {
                    required: "Required",
                    minLength: { value: 8, message: "Min. 8 chars" },
                  })}
                  hasError={!!errors.password}
                />
              </Field>

              <Field label="Confirm" htmlFor="reg-confirm-password" error={errors.confirmPassword?.message}>
                <PasswordField
                  id="reg-confirm-password"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  registration={register("confirmPassword", {
                    required: "Required",
                    validate: (val) => val === passwordValue || "Passwords mismatch",
                  })}
                  hasError={!!errors.confirmPassword}
                />
              </Field>
            </div>

            {/* Additional info / Bio */}
            <Field label="Travel Bio (Optional)" htmlFor="reg-bio">
              <textarea
                id="reg-bio"
                rows={2}
                placeholder="Tell us about your favorite destinations or travel styles…"
                className={`${inputCls} resize-none min-h-[46px]`}
                {...register("additionalInfo")}
              />
            </Field>

            {/* Action buttons: Back + Submit */}
            <div className="flex items-center gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg border border-[#E7E0D4] bg-[#FAF8F5] hover:bg-[#F1E7EE]/60 text-[#5C5468] hover:text-[#241B2F] font-semibold text-[13.5px] cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>

              <button
                id="btn-register"
                type="submit"
                disabled={isPending}
                className="flex-1 bg-[#714B67] hover:bg-[#4E3347] active:scale-[0.98] text-white font-semibold text-[14px] rounded-lg py-2.5 cursor-pointer outline-none transition-all duration-150 shadow-[0_2px_8px_rgba(113,75,103,0.25)] hover:shadow-[0_4px_14px_rgba(113,75,103,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? "Creating account…" : "Register — let's go"}
              </button>
            </div>
          </div>
        )}
      </form>

      <p className="text-center text-[13px] text-[#5C5468] mt-4">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-[#714B67] font-semibold underline underline-offset-2 hover:text-[#4E3347] transition-colors outline-none cursor-pointer"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

/* ── Sub-components ── */

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={htmlFor} className="text-[11.5px] font-semibold text-[#5C5468] uppercase tracking-wider">
          {label}
        </label>
        {error && <span className="text-[11px] text-red-500 font-medium">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function PasswordField({
  id,
  placeholder,
  registration,
  hasError,
  autoComplete,
}: {
  id: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  hasError?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${hasError ? inputErrorCls : inputCls} pr-9`}
        {...registration}
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        className="absolute right-2.5 text-[#9A93A6] hover:text-[#241B2F] transition-colors p-1 cursor-pointer outline-none"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

function RouteDash() {
  return (
    <div className="flex items-center gap-1 mx-1.5 flex-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full" />
      ))}
    </div>
  );
}
