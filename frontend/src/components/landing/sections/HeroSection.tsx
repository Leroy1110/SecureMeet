import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fadeInUp, staggerContainer, transition } from "../motion";

function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(203,213,225,0.5),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(191,219,254,0.5),transparent_45%)] px-4 dark:bg-[radial-gradient(circle_at_20%_0%,rgba(30,41,59,0.5),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(30,58,138,0.25),transparent_45%)]">
      <motion.div className="mx-auto max-w-3xl text-center" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.p variants={fadeInUp} transition={transition} className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Secure Video Conferencing
        </motion.p>
        <motion.h1 variants={fadeInUp} transition={transition} className="mt-6 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-slate-100">
          Meetings that stay between&nbsp;you.
        </motion.h1>
        <motion.p variants={fadeInUp} transition={transition} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
          End-to-end encrypted video calls, host-controlled access, and rooms
          that expire. No recordings. No compromises.
        </motion.p>
        <motion.div variants={fadeInUp} transition={transition} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-8 text-base font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-8 text-base font-medium text-slate-700 transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign in
          </Link>
        </motion.div>
        <motion.p variants={fadeInUp} transition={transition} className="mt-5 text-xs text-slate-400 dark:text-slate-500">
          No credit card required
        </motion.p>
      </motion.div>
    </section>
  );
}

export default HeroSection;
