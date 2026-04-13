import { motion } from "framer-motion";
import { features } from "../content";
import { fadeInUp, staggerContainer, transition } from "../motion";

function FeaturesSection() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <motion.div
        className="mx-auto max-w-6xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} transition={transition} className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Features
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
            Everything you need.
            <br className="hidden sm:block" /> Nothing you don't.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Built from the ground up for security-first meetings.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              transition={{ ...transition, delay: index * 0.08 }}
              className="flex flex-col items-start rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.4)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_25px_55px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900/90"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default FeaturesSection;
