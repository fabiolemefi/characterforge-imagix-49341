import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FeaturedAppCardProps {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  isNew?: boolean;
  inDevelopment?: boolean;
}

export const FeaturedAppCard = ({ 
  id,
  title, 
  subtitle, 
  imageSrc, 
  isNew = false,
  inDevelopment = false 
}: FeaturedAppCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!inDevelopment) {
      navigate(`/plugin/${id}`);
    }
  };

  return (
    <div 
      className={`feature-card bg-muted rounded-lg overflow-hidden flex flex-col ${
        inDevelopment ? "opacity-50" : ""
      }`}
    >
      <div className="relative">
        <img 
          src={imageSrc} 
          alt={title} 
          className={`w-full h-40 object-cover ${
            inDevelopment ? "grayscale" : ""
          }`}
        />
        {isNew && !inDevelopment && (
          <Badge className="absolute top-2 right-2 bg-green-600 text-white text-[10px] px-2 py-0.5">
            New
          </Badge>
        )}
        {inDevelopment && (
          <Badge className="absolute top-2 right-2 bg-yellow-600 text-white text-[10px] px-2 py-0.5">
            Em breve
          </Badge>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        
        <div className="mt-auto pt-4 flex justify-end">
          <Button
            onClick={handleClick}
            disabled={inDevelopment}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={14} className="fill-white" />
            <span>Acessar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
