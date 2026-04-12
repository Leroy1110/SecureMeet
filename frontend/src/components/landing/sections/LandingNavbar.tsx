import { Link } from "react-router-dom";

type LandingNavbarProps = {
  scrolled: boolean;
};

function LandingNavbar({ scrolled }: LandingNavbarProps) {
  return (
    <nav
      className={`sticky top-4 z-50 mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 px-5 py-3 backdrop-blur transition-shadow duration-300 dark:border-slate-700 dark:bg-slate-900/85 ${scrolled ? "shadow-md" : "shadow-sm"}`}
      style={{ marginLeft: "max(1rem, calc((100% - 72rem) / 2))", marginRight: "max(1rem, calc((100% - 72rem) / 2))" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        SecureMeet
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

export default LandingNavbar;
