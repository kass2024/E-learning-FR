import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
};

export function FadeIn({ children, className, delay = 0, duration = 0.55 }: FadeInProps) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
};

export function StaggerChildren({ children, className, stagger = 0.08 }: StaggerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function FloatCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
