"use client";

import { motion, useReducedMotion } from "motion/react";
import { ReactNode } from "react";

export function RevealStagger({ 
  children,
  className = "" 
}: { 
  children: ReactNode[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  
  return (
    <ul className={className}>
      {children.map((child, i) => (
        <motion.li
          key={i}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{
            duration: 0.5,
            delay: i * 0.05,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {child}
        </motion.li>
      ))}
    </ul>
  );
}
