interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = 'h-3.5 w-full' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-skeleton rounded-sm
        bg-[linear-gradient(90deg,var(--color-neutral-100),var(--color-neutral-200),var(--color-neutral-100))]
        bg-[length:200%_100%] ${className}`}
    />
  )
}
