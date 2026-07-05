import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title = "No data found", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FBF6EF] flex items-center justify-center mb-4 text-[#B07B4F]">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-medium text-[#3B2515] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#A9805F] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
