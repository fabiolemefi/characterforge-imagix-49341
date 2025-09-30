
import { Plus, Edit, UserPlus, Video } from "lucide-react";

type CardType = "image" | "storytelling";

interface CreationCardProps {
  type: CardType;
}

export const CreationCard = ({ type }: CreationCardProps) => {
  const isImage = type === "image";
  
  return (
    <div 
      className={`rounded-lg p-6 flex flex-col ${
        isImage ? "bg-blue-card" : "bg-yellow-card"
      }`}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {isImage ? "Image" : "Storytelling"}
      </h2>
      
      <div className="flex-grow relative min-h-[160px]">
        {isImage ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-b from-orange-300 to-purple-400 rounded-lg border-4 border-white shadow-lg rotate-3">
            <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full" />
          </div>
        ) : (
          <div className="absolute right-2 top-8">
            <div className="relative">
              <div className="w-28 h-16 bg-black rounded border border-gray-700" />
              <div className="absolute w-14 h-14 bottom-4 left-2 bg-gray-800 rounded overflow-hidden">
                <img src="/placeholder.svg" alt="Profile" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full relative left-0.5" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-8 right-4 text-xs text-white bg-black/50 px-1 rounded">
                Generating
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-4">
        {isImage ? (
          <>
            <button className="bg-black text-white py-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition">
              <Plus size={18} />
              <span>Create Image</span>
            </button>
            <button className="bg-black text-white py-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition">
              <Edit size={18} />
              <span>Edit Image</span>
            </button>
          </>
        ) : (
          <>
            <button className="bg-black text-white py-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition">
              <UserPlus size={18} />
              <span>Consistent Character</span>
            </button>
            <button className="bg-black text-white py-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition">
              <Video size={18} />
              <span>Image To Video</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
