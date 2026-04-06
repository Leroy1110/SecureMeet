import type { ReactNode } from "react";

type AuthCardLayoutProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

function AuthCardLayout({
  title,
  description,
  footer,
  children,
}: AuthCardLayoutProps) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur sm:p-10 dark:border-slate-700 dark:bg-slate-900/95">
        <header className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            SecureMeet
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </header>

        {children}

        {footer ? (
          <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
}

export default AuthCardLayout;
