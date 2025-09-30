
import { ReactNode } from "react";

interface QuickStartItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  isNew?: boolean;
  iconBg: string;
}

export const QuickStartItem = ({ icon, title, description, isNew = false, iconBg }: QuickStartItemProps) => {
  return (
    <div className="flex items-start gap-4 p-4 bg-muted rounded-lg hover:bg-accent transition-colors cursor-pointer">
      <div className={`p-3 rounded-lg ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white">{title}</h3>
          {isNew && (
            <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
              New
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
};
