import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ExternalLink } from "lucide-react";
import { Link } from "@/types/test";

interface LinksSectionProps {
  links: Link[];
  onChange: (links: Link[]) => void;
  disabled?: boolean;
}

export function LinksSection({ links, onChange, disabled }: LinksSectionProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const handleAdd = () => {
    if (!title || !url) return;

    try {
      new URL(url);
    } catch {
      alert("URL inválida");
      return;
    }

    const newLink: Link = {
      title,
      url,
      added_at: new Date().toISOString(),
    };

    onChange([...links, newLink]);
    setTitle("");
    setUrl("");
  };

  const handleRemove = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange(newLinks);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Links Úteis</label>
        {!disabled && (
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handleAdd} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="text-sm font-medium">{link.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {link.url}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
