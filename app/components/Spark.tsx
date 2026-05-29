type SparkProps = {
  size?: number;
  className?: string;
};

// A lightning bolt emoji used as the "thinking" indicator.
export default function Spark({ size = 28, className = "" }: SparkProps) {
  return (
    <span
      role="img"
      aria-label="lightning bolt"
      style={{ fontSize: size, lineHeight: 1 }}
      className={`inline-block ${className}`}
    >
      ⚡
    </span>
  );
}
