import { Plus, Edit, UserPlus, Video } from "lucide-react";
type CardType = "image" | "storytelling";
interface CreationCardProps {
  type: CardType;
}
export const CreationCard = ({
  type
}: CreationCardProps) => {
  const isImage = type === "image";
  return;
};