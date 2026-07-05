const ROUNDED_MAP = {
  lg: "rounded-lg",
  md: "rounded-md",
  full: "rounded-full",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  none: "",
};

export default function Skeleton({ className = "", width, height, rounded = "lg" }) {
  const style = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  const roundedClass = ROUNDED_MAP[rounded] || ROUNDED_MAP.lg;

  return (
    <div
      className={`bg-[#EDE1CF]/60 animate-pulse ${roundedClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE1CF] p-4 space-y-3">
      <Skeleton height={16} width="60%" />
      <Skeleton height={14} width="40%" />
      <Skeleton height={14} width="80%" />
      <div className="flex gap-2 pt-2">
        <Skeleton height={32} width={80} rounded="md" />
        <Skeleton height={32} width={80} rounded="md" />
      </div>
    </div>
  );
}

export function TableGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#EDE1CF] p-4 space-y-2">
          <Skeleton height={48} width={48} rounded="full" />
          <Skeleton height={14} width="50%" />
          <Skeleton height={12} width="70%" />
        </div>
      ))}
    </div>
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE1CF] p-4 flex gap-4">
      <Skeleton height={80} width={80} rounded="xl" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="70%" />
        <Skeleton height={14} width="50%" />
        <Skeleton height={14} width="90%" />
      </div>
    </div>
  );
}

export function KDSOrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE1CF] p-4 space-y-2">
      <div className="flex justify-between">
        <Skeleton height={14} width="30%" />
        <Skeleton height={14} width="20%" />
      </div>
      <Skeleton height={12} width="50%" />
      <div className="space-y-1.5 pt-2">
        <Skeleton height={12} width="90%" />
        <Skeleton height={12} width="75%" />
        <Skeleton height={12} width="60%" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton height={36} width="50%" rounded="md" />
        <Skeleton height={36} width="50%" rounded="md" />
      </div>
    </div>
  );
}
