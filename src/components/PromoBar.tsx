
import { X } from "lucide-react";
import { useState } from "react";

export const PromoBar = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-promo text-promo-foreground py-2 px-4 flex items-center justify-center relative animate-fade-in">
      <div className="flex items-center justify-center w-full space-x-2">
        <span className="text-yellow-300">⚡ Limited-time offer!</span>
        <span>Unlock a year of limitless creativity with all annual plans at 50% off.</span>
        <button className="bg-white text-purple-700 px-4 py-1 rounded-md text-sm font-medium hover:bg-opacity-90 transition-all">
          View Plan
        </button>
      </div>
      <button 
        onClick={() => setIsVisible(false)} 
        className="absolute right-4 text-white hover:text-gray-200 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};
