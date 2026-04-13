import { motion } from "framer-motion";
import { securityChecklist } from "../content";
import { slideInLeft, slideInRight, transition } from "../motion";

function SecuritySection() {
  return (
    <section className="bg-slate-50 px-4 py-24 sm:py-32 dark:bg-slate-900/50">
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={slideInLeft}
          transition={transition}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Security
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
            Encryption isn't optional.
            <br />
            It's the architecture.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            SecureMeet uses RSA key exchange and AES symmetric encryption for
            every message. Your data is encrypted before it touches the server
            and stays encrypted at rest.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={slideInRight}
          transition={transition}
          className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
        >
          <ul className="space-y-4">
            {securityChecklist.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

export default SecuritySection;
