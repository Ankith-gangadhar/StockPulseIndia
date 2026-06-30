import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom";
}

export default function MetricTooltip({ children, content, position = "top" }: Props) {
  return (
    <span className="metric-tooltip-wrapper">
      {children}
      <span className={`metric-tooltip-content metric-tooltip-${position}`}>{content}</span>
    </span>
  );
}
