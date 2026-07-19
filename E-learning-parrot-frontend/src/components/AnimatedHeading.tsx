import React, { useEffect, useMemo, useState } from "react";

interface AnimatedHeadingProps {
  phrases: string[];
  className?: string;
  /** Milliseconds per character */
  speed?: number;
  /** Milliseconds to pause after a phrase finishes */
  pause?: number;
}

/**
 * Simple typewriter-style animated heading that cycles through phrases.
 *
 * Usage:
 * <AnimatedHeading
 *   phrases={["First", "Second"]}
 *   className="text-primary"
 *   speed={70}
 *   pause={1400}
 * />
 */
const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
  phrases,
  className = "",
  speed = 70,
  pause = 1400,
}) => {
  const safePhrases = useMemo(() => (phrases && phrases.length ? phrases : [""]), [phrases]);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const current = safePhrases[phraseIndex] ?? "";

    if (charIndex <= current.length) {
      const timeout = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex));
        setCharIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }

    const pauseTimeout = setTimeout(() => {
      setCharIndex(0);
      setPhraseIndex((prev) => (prev + 1) % safePhrases.length);
    }, pause);

    return () => clearTimeout(pauseTimeout);
  }, [charIndex, phraseIndex, safePhrases, speed, pause]);

  return <span className={className}>{displayText}</span>;
};

export default AnimatedHeading;
