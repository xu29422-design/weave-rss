"use client";

import { motion, useAnimation, Variants } from "framer-motion";

const pathVariants: Variants = {
  normal: { d: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" },
  animate: {
    d: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    rotate: 360,
    transition: {
      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
    },
  },
};

export const SunIcon = () => {
  const controls = useAnimation();
  return (
    <div
      className="cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center"
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <motion.path
          variants={pathVariants}
          animate={controls}
        />
      </svg>
    </div>
  );
};

export const CpuIcon = () => {
  const controls = useAnimation();
  return (
    <div
      className="cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center"
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <motion.path d="M15 2v2" animate={controls} variants={{ animate: { y: [0, -2, 0] } }} />
        <motion.path d="M12 2v2" animate={controls} variants={{ animate: { y: [0, -2, 0], transition: { delay: 0.1 } } }} />
        <motion.path d="M9 2v2" animate={controls} variants={{ animate: { y: [0, -2, 0], transition: { delay: 0.2 } } }} />
        <motion.path d="M15 20v2" animate={controls} variants={{ animate: { y: [0, 2, 0] } }} />
        <motion.path d="M12 20v2" animate={controls} variants={{ animate: { y: [0, 2, 0], transition: { delay: 0.1 } } }} />
        <motion.path d="M9 20v2" animate={controls} variants={{ animate: { y: [0, 2, 0], transition: { delay: 0.2 } } }} />
        <motion.path d="M20 15h2" animate={controls} variants={{ animate: { x: [0, 2, 0] } }} />
        <motion.path d="M20 12h2" animate={controls} variants={{ animate: { x: [0, 2, 0], transition: { delay: 0.1 } } }} />
        <motion.path d="M20 9h2" animate={controls} variants={{ animate: { x: [0, 2, 0], transition: { delay: 0.2 } } }} />
        <motion.path d="M2 15h2" animate={controls} variants={{ animate: { x: [0, -2, 0] } }} />
        <motion.path d="M2 12h2" animate={controls} variants={{ animate: { x: [0, -2, 0], transition: { delay: 0.1 } } }} />
        <motion.path d="M2 9h2" animate={controls} variants={{ animate: { x: [0, -2, 0], transition: { delay: 0.2 } } }} />
      </svg>
    </div>
  );
};

export const GlobeIcon = () => {
  const controls = useAnimation();
  return (
    <div
      className="cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center"
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <motion.path
          d="M2 12h20"
          animate={controls}
          variants={{ animate: { pathLength: [1, 0.8, 1], opacity: [1, 0.5, 1] } }}
        />
        <motion.path
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
          animate={controls}
          variants={{ animate: { rotateY: 360, transition: { duration: 2, repeat: Infinity, ease: "linear" } } }}
        />
      </svg>
    </div>
  );
};

export const RssIcon = () => {
  const controls = useAnimation();
  return (
    <div
      className="cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center"
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
        <motion.path
          d="M4 11a9 9 0 0 1 9 9"
          animate={controls}
          variants={{ animate: { pathLength: [0, 1], transition: { duration: 0.5 } } }}
        />
        <motion.path
          d="M4 4a16 16 0 0 1 16 16"
          animate={controls}
          variants={{ animate: { pathLength: [0, 1], transition: { duration: 0.8, delay: 0.2 } } }}
        />
      </svg>
    </div>
  );
};

export const WebhookIcon = () => {
  const controls = useAnimation();
  return (
    <div
      className="cursor-pointer select-none p-2 hover:bg-accent rounded-md transition-colors duration-200 flex items-center justify-center"
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("normal")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 11.45a6.45 6.45 0 0 1 0 1.1" />
        <path d="M6 11.45a6.45 6.45 0 0 0 0 1.1" />
        <circle cx="12" cy="12" r="2" />
        <motion.circle
          cx="12"
          cy="12"
          r="2"
          animate={controls}
          variants={{ animate: { scale: [1, 1.5, 1], transition: { duration: 0.5, repeat: Infinity } } }}
        />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  );
};
