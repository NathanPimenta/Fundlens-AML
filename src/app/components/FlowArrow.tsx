import { useRef, useState, useEffect } from 'react';

interface FlowArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  amount?: string;
  color?: 'teal' | 'red';
  curved?: boolean;
  showLabel?: boolean;
  /** Stagger overlapping labels along the edge normal */
  labelIndex?: number;
  opacity?: number;
  status?: 'active' | 'past' | 'future' | 'normal';
}

export default function FlowArrow({
  from,
  to,
  amount,
  color = 'teal',
  curved = false,
  showLabel = false,
  labelIndex = 0,
  opacity,
  status = 'normal',
}: FlowArrowProps) {
  const gRef = useRef<SVGGElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const svg = gRef.current?.ownerSVGElement;
    if (!svg) return;

    const updateSize = () => {
      const rect = svg.getBoundingClientRect();
      setDimensions({
        width: rect.width || 800,
        height: rect.height || 600,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(svg);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!dimensions) {
    return <g ref={gRef} />;
  }

  const { width, height } = dimensions;

  // Convert percentages to absolute SVG user space coordinates
  const fromX = (from.x / 100) * width;
  const fromY = (from.y / 100) * height;
  const toX = (to.x / 100) * width;
  const toY = (to.y / 100) * height;

  const strokeColor = color === 'red' ? '#EF4444' : '#00C9A7';
  const baseOpacity = color === 'red' ? 0.75 : 0.5;

  let strokeOpacity = opacity !== undefined ? opacity : baseOpacity;
  let strokeWidth = 1.5;
  let strokeDasharray = "4 4";
  let isAnimated = false;

  if (status === 'active') {
    strokeOpacity = 1.0;
    strokeWidth = 2.5;
    strokeDasharray = "6 4";
    isAnimated = true;
  } else if (status === 'past') {
    strokeOpacity = 0.35;
    strokeWidth = 1.5;
    strokeDasharray = "4 4";
  } else if (status === 'future') {
    strokeOpacity = 0.05;
    strokeWidth = 1.0;
    strokeDasharray = "4 4";
  } else if (status === 'normal') {
    strokeOpacity = opacity !== undefined ? opacity : baseOpacity;
    strokeWidth = 1.5;
    strokeDasharray = "4 4";
  }

  const markerId = color === 'red' ? 'arrowhead-red' : 'arrowhead-teal';
  let displayMarker: string | undefined;

  if (status === 'active') {
    displayMarker = `url(#${markerId}-active)`;
  } else if (status === 'past') {
    displayMarker = `url(#${markerId}-past)`;
  } else if (status === 'future') {
    displayMarker = `url(#${markerId}-future)`;
  } else {
    displayMarker = `url(#${markerId})`;
  }

  console.log("FlowArrow Render:", amount, "status:", status, "strokeOpacity:", strokeOpacity, "coords:", fromX, fromY, toX, toY);

  let pathD: string;
  let labelX: number;
  let labelY: number;

  if (curved) {
    const midX = (fromX + toX) / 2;
    const controlY = 0.15 * height;
    pathD = `M ${fromX} ${fromY} Q ${midX} ${controlY}, ${toX} ${toY}`;
    labelX = midX;
    labelY = controlY - 8;
  } else {
    pathD = `M ${fromX} ${fromY} L ${toX} ${toY}`;
    labelX = (fromX + toX) / 2;
    labelY = (fromY + toY) / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const stagger = (labelIndex - 2) * 10; // offset in px instead of %
    labelX += nx * stagger;
    labelY += ny * stagger - 6; // offset in px
  }

  const displayLabel = showLabel && amount && status !== 'future';
  const labelOpacity = status === 'active' ? 1.0 : status === 'past' ? 0.4 : 1.0;

  return (
    <g ref={gRef}>
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={{
          opacity: strokeOpacity,
          transition: 'all 0.3s ease',
        }}
        className={isAnimated ? "animate-dash" : undefined}
        markerEnd={displayMarker}
        opacity={strokeOpacity}
      />

      {displayLabel && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#1F2937"
          stroke="white"
          strokeWidth={4}
          paintOrder="stroke fill"
          fontSize={status === 'active' ? "11" : "10"}
          fontFamily="DM Mono"
          fontWeight={status === 'active' ? "800" : "600"}
          className="pointer-events-none select-none transition-all duration-300"
          style={{ opacity: labelOpacity }}
        >
          {amount}
        </text>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </g>
  );
}
