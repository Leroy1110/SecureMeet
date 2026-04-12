import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fadeInUp, staggerContainer, transition } from "../motion";

function FinalCtaSection() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.h2 variants={fadeInUp} transition={transition} className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
          Ready for meetings that respect your&nbsp;privacy?
        </motion.h2>
        <motion.div variants={fadeInUp} transition={transition} className="mt-10">
          <Link
            to="/register"
            className="inline-flex h-14 items-center justify-center rounded-xl bg-black px-10 text-base font-medium text-white shadow-sm transition duration-200 hover:bg-neutral-800 dark:bg-blue-900 dark:hover:bg-blue-800"
          >
            Create your free account
          </Link>
        </motion.div>
        <motion.p variants={fadeInUp} transition={transition} className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-400"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </section>
  );
}

export default FinalCtaSection;
