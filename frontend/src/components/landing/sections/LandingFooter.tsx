function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 px-4 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          SecureMeet
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export default LandingFooter;
