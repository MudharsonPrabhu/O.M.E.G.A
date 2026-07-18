import { useEffect, useState } from "react";

interface TypedTextProps {
  text: string;
  speedMs?: number;
  className?: string;
  active: boolean;
}

export function TypedText({ text, speedMs = 22, className, active }: TypedTextProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    setCount(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [active, text, speedMs]);

  return <span className={className}>{active ? text.slice(0, count) : ""}</span>;
}
