
import { ArrowRight, Play } from "lucide-react";

interface FeaturedAppCardProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  isNew?: boolean;
}

export const FeaturedAppCard = ({ title, subtitle, imageSrc, isNew = false }: FeaturedAppCardProps) => {
  return (
    <div className="feature-card bg-muted rounded-lg overflow-hidden flex flex-col">
      <div className="relative">
        <img src={imageSrc} alt={title} className="w-full h-40 object-cover" />
        {isNew && (
          <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
            New
          </span>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        
        <div className="mt-auto pt-4 flex justify-end">
          <button className="run-button bg-blue-600 text-white px-4 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium">
            <Play size={14} className="fill-white" />
            <span>Run</span>
          </button>
        </div>
      </div>
    </div>
  );
};
