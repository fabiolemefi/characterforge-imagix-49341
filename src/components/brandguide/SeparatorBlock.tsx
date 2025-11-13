interface SeparatorBlockProps {
  blockId: string;
  content?: any;
  isAdmin: boolean;
  onContentChange: (content: any) => void;
}

export const SeparatorBlock = ({ blockId, content, isAdmin, onContentChange }: SeparatorBlockProps) => {
  return (
    <div className="w-full max-w-4xl my-12">
      <hr className="border-t border-foreground" />
    </div>
  );
};
