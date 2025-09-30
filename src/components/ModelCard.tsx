
import { ArrowRight, Plus, Lock } from "lucide-react";

interface ModelCardProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  isTrainYourOwn?: boolean;
  tags?: Array<{
    label: string;
    variant: 'blue' | 'green' | 'orange' | 'yellow';
  }>;
}

export const ModelCard = ({ 
  title, 
  subtitle, 
  imageSrc, 
  isTrainYourOwn = false,
  tags = []
}: ModelCardProps) => {
  return (
    <div className={`rounded-lg overflow-hidden flex flex-col relative ${isTrainYourOwn ? 'border border-blue-500 border-opacity-50' : 'bg-[#1A1A1A]'}`}>
      {isTrainYourOwn ? (
        <div className="flex-1 flex flex-col">
          <div className="h-[225px] flex items-center justify-center bg-[#0E1526]">
            <Plus size={50} className="text-blue-500" />
            {/* Lock icon in top right */}
            <div className="absolute top-2 right-2 bg-[#312200] p-2 rounded-md">
              <Lock size={20} className="text-yellow-500" />
            </div>
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-medium text-white text-xl">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="h-[225px]">
            <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-medium text-white text-xl">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className={`px-3 py-1 rounded-full text-xs font-medium
                      ${tag.variant === 'blue' ? 'bg-blue-900 text-blue-300' : ''}
                      ${tag.variant === 'green' ? 'bg-green-900 text-green-300' : ''}
                      ${tag.variant === 'orange' ? 'bg-orange-900 text-orange-300' : ''}
                      ${tag.variant === 'yellow' ? 'bg-yellow-900 text-yellow-300' : ''}
                    `}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex border-t border-gray-800 divide-x divide-gray-800">
        <button className="flex-1 py-3 text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors text-center">
          Create
        </button>
        <button className="flex-1 py-3 text-white font-medium hover:bg-gray-800 transition-colors text-center">
          Gallery
        </button>
      </div>
    </div>
  );
};
