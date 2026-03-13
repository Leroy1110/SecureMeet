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
    <section className="flex min-h-screen items-center justify-center bg-slate-50 px-2 py-10 sm:px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
        <header className="mb-6 text-center sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            SecureMeet
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </header>

        {children}

        {footer ? (
          <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {footer}
          </footer>
        ) : null}
      </div>
    </section>
  );
}

export default AuthCardLayout;