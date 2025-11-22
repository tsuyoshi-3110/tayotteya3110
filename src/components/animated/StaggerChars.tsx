"use client";

import { motion, Variants, Transition } from "framer-motion";

const STAGGER_EASE: Transition["ease"] = [0.16, 1, 0.3, 1];

export function StaggerChars({
  text,
  className,
  delay = 0.25,
  stagger = 0.08,
  duration = 1.0,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}) {
  const container: Variants = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: STAGGER_EASE },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.7 }}
      className={className}
    >
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          variants={child}
          className={`${className} inline-block`}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </motion.span>
  );
}
