import { motion } from "framer-motion";
import { steps } from "../content";
import { fadeInUp, staggerContainer, transition } from "../motion";

function HowItWorksSection() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <motion.div
        className="mx-auto max-w-4xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} transition={transition} className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            How it works
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
            Three steps. Total privacy.
          </h2>
        </motion.div>

        <div className="relative mt-16 grid gap-10 sm:grid-cols-3 sm:gap-6">
          <div className="absolute left-[calc(16.667%+20px)] right-[calc(16.667%+20px)] top-[22px] hidden h-px bg-slate-200 sm:block dark:bg-slate-800" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={fadeInUp}
              transition={{ ...transition, delay: index * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {step.number}
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default HowItWorksSection;
