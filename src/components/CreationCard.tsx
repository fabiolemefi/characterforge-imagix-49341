import { Plus, Edit, UserPlus, Video } from "lucide-react";
type CardType = "image" | "storytelling";
interface CreationCardProps {
  type: CardType;
}
export const CreationCard = ({
  type
}: CreationCardProps) => {
  const isImage = type === "image";
  
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 mb-3">
        {isImage ? <Edit className="text-primary" /> : <Video className="text-primary" />}
        <h3 className="font-semibold">{isImage ? "Criação de Imagem" : "Storytelling"}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {isImage 
          ? "Crie imagens personalizadas usando IA" 
          : "Crie histórias envolventes com IA"}
      </p>
    </div>
  );
};