type ThinkingDotProps = {
  size?: number;
  className?: string;
};

export default function ThinkingDot({
  size = 17,
  className = "",
}: ThinkingDotProps) {
  return (
    <span
      role="status"
      aria-label="Thinking"
      style={{ width: size, height: size }}
      className={`inline-block animate-pulse rounded-full bg-neutral-800 dark:bg-neutral-100 ${className}`}
    />
  );
}
