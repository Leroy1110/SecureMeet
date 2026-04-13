import { Link } from "react-router-dom";

type LandingNavbarProps = {
  scrolled: boolean;
};

function LandingNavbar({ scrolled }: LandingNavbarProps) {
  return (
    <nav
      className={`sticky top-2 z-50 mx-auto flex max-w-6xl items-center justify-between rounded-2xl border px-5 py-3 backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? "border-slate-300/80 bg-white/90 shadow-[0_16px_45px_-28px_rgba(15,23,42,0.5)] dark:border-slate-700/80 dark:bg-slate-900/88 dark:shadow-[0_16px_45px_-26px_rgba(0,0,0,0.7)]"
          : "border-slate-200/80 bg-white/75 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700/70 dark:bg-slate-900/72 dark:shadow-[0_14px_36px_-26px_rgba(0,0,0,0.65)]"
      }`}
      style={{
        marginLeft: "max(1rem, calc((100% - 72rem) / 2))",
        marginRight: "max(1rem, calc((100% - 72rem) / 2))",
      }}
    >
      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">
        <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.16)] dark:bg-blue-400 dark:shadow-[0_0_0_4px_rgba(96,165,250,0.2)]" />
        SecureMeet
      </p>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/login"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white/90 px-4 text-sm font-medium text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(59,130,246,0.75)] transition duration-200 hover:from-blue-500 hover:to-indigo-500 dark:from-blue-500 dark:to-indigo-500"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

export default LandingNavbar;
