export default function LoadingSpinner({ size = "md", className = "" }) {
  const sizeMap = { sm: "w-5 h-5 border-2", md: "w-8 h-8 border-2", lg: "w-12 h-12 border-4" };
  const dims = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className={`${dims} rounded-full border-[#EDE1CF] border-t-[#B07B4F] animate-spin`} role="status" aria-label="Loading" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
