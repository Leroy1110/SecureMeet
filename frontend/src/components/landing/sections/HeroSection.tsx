import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fadeInUp, staggerContainer, transition } from "../motion";

function HeroSection() {
  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden px-4 pb-16 pt-20 sm:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.95)_52%,rgba(241,245,249,0.95)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,0.95)_50%,rgba(5,18,52,0.97)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(148,163,184,0.14),transparent_40%),radial-gradient(circle_at_82%_84%,rgba(96,165,250,0.16),transparent_42%)] dark:bg-[radial-gradient(circle_at_24%_24%,rgba(59,130,246,0.16),transparent_40%),radial-gradient(circle_at_82%_84%,rgba(99,102,241,0.2),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:44px_44px] dark:opacity-12" />

      <motion.div
        className="pointer-events-none absolute -left-10 top-32 h-72 w-72 rounded-full bg-sky-300/24 blur-[120px] dark:bg-blue-500/24"
        animate={{ x: [0, 24, 0], y: [0, 16, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-14 bottom-14 h-72 w-72 rounded-full bg-indigo-300/24 blur-[120px] dark:bg-indigo-500/24"
        animate={{ x: [0, -28, 0], y: [0, -12, 0], scale: [1.04, 1, 1.04] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div className="relative mx-auto max-w-3xl text-center" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeInUp} transition={transition} className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/55 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Secure Video Conferencing
        </motion.div>

        <motion.h1 variants={fadeInUp} transition={transition} className="mt-8 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-slate-100">
          Meetings that stay
          <span className="block bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 bg-clip-text text-transparent dark:from-blue-300 dark:via-indigo-300 dark:to-slate-100">
            between you.
          </span>
        </motion.h1>

        <motion.p variants={fadeInUp} transition={transition} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
          End-to-end encrypted video calls, host-controlled access, and rooms
          that expire. No recordings. No compromises.
        </motion.p>

        <motion.div variants={fadeInUp} transition={transition} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-9 text-base font-semibold text-white shadow-[0_18px_38px_-20px_rgba(59,130,246,0.75)] transition duration-200 hover:from-blue-500 hover:to-indigo-500"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white/90 px-9 text-base font-medium text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            Sign in
          </Link>
        </motion.div>

        <motion.p variants={fadeInUp} transition={transition} className="mt-5 text-xs text-slate-500 dark:text-slate-400">
          No credit card required
        </motion.p>

        <motion.div variants={fadeInUp} transition={transition} className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/65">AES + RSA encryption</span>
          <span className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/65">No recordings</span>
          <span className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/65">Auto-expiring rooms</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default HeroSection;
