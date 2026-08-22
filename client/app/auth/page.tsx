"use client";

import { useState } from "react";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"] });

type Mode = "login" | "register";

/* ── Shared class strings ── */
const inputCls =
  "w-full bg-[#F1EDE6] border border-transparent rounded-lg px-3 py-2 " +
  "text-[13px] text-[#241B2F] outline-none " +
  "placeholder:text-[#9A93A6] " +
  "transition-[border-color,box-shadow,background] duration-150 " +
  "hover:border-[#D6CCBC] " +
  "focus:border-[#714B67] focus:shadow-[0_0_0_3px_#F1E7EE] focus:bg-white";

const btnCls =
  "w-full mt-1.5 bg-[#714B67] hover:bg-[#4E3347] active:scale-[0.98] " +
  "text-white font-semibold text-[14px] rounded-lg py-2.5 cursor-pointer outline-none " +
  "transition-all duration-150 " +
  "hover:shadow-[0_4px_12px_rgba(113,75,103,0.28)] " +
  "focus-visible:shadow-[0_0_0_3px_#F1E7EE]";

/* ─────────────────────────────────────────── */

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className={`h-screen flex overflow-hidden bg-[#FAF8F5] ${inter.className}`}>

      {/* ── Left panel ── */}
      <aside className="hidden lg:flex flex-col justify-between flex-none w-[42%] h-screen bg-[#714B67] p-12 relative overflow-hidden">
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
          <h1 className={`text-[38px] font-bold text-white leading-[1.2] tracking-tight mb-4 ${spaceGrotesk.className}`}>
            Plan every stop.<br />
            <span className="text-white/50">See the whole</span><br />
            journey.
          </h1>
          <p className="text-[15px] text-white/60 leading-relaxed max-w-[280px]">
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
            <div className="flex justify-between mt-1.5">
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

      {/* ── Right panel ── */}
      <main className="flex-1 h-screen flex items-center justify-center px-6 py-4">
        <div className="w-full max-w-[480px] bg-white rounded-[20px] border border-[#E7E0D4] px-8 py-6
            shadow-[0_1px_2px_rgba(36,27,47,0.04),0_8px_24px_rgba(36,27,47,0.06)]
            animate-[cardIn_0.3s_ease-out]">

          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-full bg-[#F1E7EE] border-2 border-[#E7E0D4]
                relative overflow-hidden flex items-center justify-center cursor-pointer
                transition-all duration-150 group
                hover:border-[#714B67] hover:shadow-[0_0_0_3px_#F1E7EE] hover:scale-[1.04]"
              role="button"
              tabIndex={0}
              aria-label={mode === "register" ? "Upload profile photo" : "User avatar"}
            >
              <span className="text-2xl select-none">{mode === "login" ? "🧳" : "✈️"}</span>
              {mode === "register" && (
                <div className="absolute inset-0 bg-[#714B67]/80 flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-opacity duration-150
                  text-white text-[11px] font-semibold tracking-wide">
                  Upload
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#E7E0D4] mb-4" role="tablist">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                id={`tab-${m}`}
                role="tab"
                aria-selected={mode === m}
                aria-controls={`panel-${m}`}
                onClick={() => setMode(m)}
                className={[
                  "flex-1 py-2 text-[14px] relative outline-none cursor-pointer transition-colors duration-150",
                  "after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-full after:h-0.5",
                  "after:bg-[#714B67] after:transition-transform after:duration-200 after:ease-out",
                  "focus-visible:shadow-[0_0_0_3px_#F1E7EE]",
                  spaceGrotesk.className,
                  mode === m
                    ? "text-[#241B2F] font-semibold after:scale-x-100"
                    : "text-[#5C5468] font-medium after:scale-x-0",
                ].join(" ")}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ── Login ── */}
          {mode === "login" && (
            <div id="panel-login" role="tabpanel" aria-labelledby="tab-login"
              className="animate-[panelIn_0.22s_ease-out]">
              <h2 className={`text-[20px] font-semibold text-[#241B2F] tracking-tight mb-0.5 ${spaceGrotesk.className}`}>
                Welcome back
              </h2>
              <p className="text-[12px] text-[#5C5468] mb-4 leading-relaxed">
                Sign in to continue planning your trips.
              </p>

              <div className="flex flex-col gap-2.5">
                <Field label="Username" htmlFor="login-username">
                  <input
                    id="login-username" type="text"
                    placeholder="your_username" autoComplete="username"
                    className={inputCls}
                  />
                </Field>

                <Field label="Password" htmlFor="login-password">
                  <PasswordField id="login-password" placeholder="••••••••" />
                  <div className="flex justify-end mt-0.5">
                    <button type="button"
                      className="text-[12px] text-[#714B67] font-medium underline underline-offset-2
                        hover:text-[#4E3347] transition-colors outline-none cursor-pointer">
                      Forgot password?
                    </button>
                  </div>
                </Field>
              </div>

              <button id="btn-login" type="submit" className={btnCls}>
                Sign in to GlobeTrotter
              </button>

              <Divider />

              <p className="text-center text-[12px] text-[#5C5468] mt-2">
                New here?{" "}
                <button type="button" onClick={() => setMode("register")}
                  className="text-[#714B67] font-semibold underline underline-offset-2
                    hover:text-[#4E3347] transition-colors outline-none cursor-pointer">
                  Create an account
                </button>
              </p>
            </div>
          )}

          {/* ── Register ── */}
          {mode === "register" && (
            <div id="panel-register" role="tabpanel" aria-labelledby="tab-register"
              className="animate-[panelIn_0.22s_ease-out]">
              <h2 className={`text-[20px] font-semibold text-[#241B2F] tracking-tight mb-0.5 ${spaceGrotesk.className}`}>
                Join GlobeTrotter
              </h2>
              <p className="text-[12px] text-[#5C5468] mb-3 leading-relaxed">
                Create your account and start building your first route.
              </p>

              <div className="flex flex-col gap-2">
                {/* First + Last */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name" htmlFor="reg-firstname">
                    <input id="reg-firstname" type="text" placeholder="Priya"
                      autoComplete="given-name" className={inputCls} />
                  </Field>
                  <Field label="Last name" htmlFor="reg-lastname">
                    <input id="reg-lastname" type="text" placeholder="Sharma"
                      autoComplete="family-name" className={inputCls} />
                  </Field>
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email address" htmlFor="reg-email">
                    <input id="reg-email" type="email" placeholder="priya@example.com"
                      autoComplete="email" className={inputCls} />
                  </Field>
                  <Field label="Phone number" htmlFor="reg-phone">
                    <input id="reg-phone" type="tel" placeholder="+91 98765 43210"
                      autoComplete="tel" className={inputCls} />
                  </Field>
                </div>

                {/* City + Country */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" htmlFor="reg-city">
                    <input id="reg-city" type="text" placeholder="Mumbai"
                      autoComplete="address-level2" className={inputCls} />
                  </Field>
                  <Field label="Country" htmlFor="reg-country">
                    <input id="reg-country" type="text" placeholder="India"
                      autoComplete="country-name" className={inputCls} />
                  </Field>
                </div>

                {/* Additional info */}
                <Field label="Additional information" htmlFor="reg-bio">
                  <textarea
                    id="reg-bio"
                    placeholder="Tell us about your travel style, favourite destinations…"
                    className={`${inputCls} resize-none min-h-[52px]`}
                  />
                </Field>
              </div>

              <button id="btn-register" type="submit" className={btnCls}>
                Register — let&apos;s go
              </button>

              <p className="text-center text-[12px] text-[#5C5468] mt-2">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")}
                  className="text-[#714B67] font-semibold underline underline-offset-2
                    hover:text-[#4E3347] transition-colors outline-none cursor-pointer">
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Keyframe definitions — only place inline CSS is used */}
      <style>{`
        @keyframes cardIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes panelIn { from { opacity:0; transform:translateX(6px);  } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold text-[#5C5468] uppercase tracking-[0.4px]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-[#E7E0D4]" />
      <span className="text-[12px] font-medium text-[#9A93A6]">or</span>
      <div className="flex-1 h-px bg-[#E7E0D4]" />
    </div>
  );
}

function RouteDash() {
  return (
    <div
      className="flex-1 max-w-[56px]"
      style={{
        height: 2,
        background:
          "repeating-linear-gradient(to right,rgba(255,255,255,0.4) 0,rgba(255,255,255,0.4) 6px,transparent 6px,transparent 12px)",
      }}
    />
  );
}

function PasswordField({ id, placeholder }: { id: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete="current-password"
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A93A6]
          hover:text-[#5C5468] transition-colors duration-150
          cursor-pointer p-1 leading-none outline-none text-base"
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
