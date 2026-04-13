import { motion } from "framer-motion";
import { trustItems } from "../content";
import { fadeInUp, transition } from "../motion";

function TrustBarSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={fadeInUp}
      transition={transition}
      className="border-y border-slate-200 py-12 dark:border-slate-800"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-4 sm:gap-12">
        {trustItems.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-2.5 text-sm font-medium text-slate-500 dark:text-slate-400"
          >
            <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

export default TrustBarSection;
