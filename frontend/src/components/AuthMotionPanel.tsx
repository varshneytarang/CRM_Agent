import { useMemo, useRef, useState, type MouseEvent } from "react";

type AuthMotionPanelProps = {
  title: string;
  subtitle: string;
  accentLabel: string;
};

type MotionNode = {
  id: string;
  size: number;
  x: number;
  y: number;
  speed: number;
  hue: "cyan" | "teal" | "sky";
};

const nodesSeed: MotionNode[] = [
  { id: "n1", size: 110, x: 10, y: 18, speed: 1.1, hue: "cyan" },
  { id: "n2", size: 72, x: 62, y: 12, speed: 1.3, hue: "teal" },
  { id: "n3", size: 96, x: 70, y: 44, speed: 0.9, hue: "sky" },
  { id: "n4", size: 64, x: 22, y: 56, speed: 1.5, hue: "cyan" },
  { id: "n5", size: 88, x: 48, y: 70, speed: 1.15, hue: "teal" },
  { id: "n6", size: 54, x: 82, y: 76, speed: 1.45, hue: "sky" },
];

export function AuthMotionPanel({ title, subtitle, accentLabel }: AuthMotionPanelProps) {
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const [isInteractive, setIsInteractive] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  const frameRef = useRef<number | null>(null);

  const nodes = useMemo(() => nodesSeed, []);

  function handleMove(event: MouseEvent<HTMLDivElement>) {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) / Math.max(1, rect.height);

    frameRef.current = requestAnimationFrame(() => {
      setCursor({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
      frameRef.current = null;
    });
  }

  return (
    <aside
      className="auth-motion-panel"
      onMouseMove={handleMove}
      onMouseEnter={() => setIsInteractive(true)}
      onMouseLeave={() => setIsInteractive(false)}
      onFocus={() => setIsInteractive(true)}
      onBlur={() => setIsInteractive(false)}
    >
      <div className="auth-motion-grid" aria-hidden="true" />
      <div className="auth-motion-aurora" aria-hidden="true" />

      {nodes.map((node) => {
        const offsetX = (cursor.x - 0.5) * 22 * node.speed;
        const offsetY = (cursor.y - 0.5) * 18 * node.speed;

        return (
          <span
            key={node.id}
            className={`auth-node auth-node-${node.hue}`}
            style={{
              width: `${node.size}px`,
              height: `${node.size}px`,
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${1 + pulseTick * 0.015})`,
            }}
          />
        );
      })}

      <div className="auth-motion-content">
        <p className="auth-motion-kicker">Interactive Playground</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>

        <div className="auth-motion-pill-row">
          <span className="auth-motion-pill">Live Signals</span>
          <span className="auth-motion-pill">Smart Agents</span>
          <span className="auth-motion-pill">Guided Actions</span>
        </div>

        <button
          type="button"
          className="auth-motion-play-btn"
          onClick={() => setPulseTick((prev) => (prev + 1) % 5)}
        >
          {accentLabel}
        </button>

        <p className={`auth-motion-hint ${isInteractive ? "is-visible" : ""}`}>
          Move your cursor to explore how signals and agents respond in real time.
        </p>
      </div>
    </aside>
  );
}
