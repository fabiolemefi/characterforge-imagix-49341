import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldSchema {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  auto_generate?: boolean;
}

interface CollectionProgressProps {
  extractedData: Record<string, any>;
  fieldsSchema: FieldSchema[];
  className?: string;
}

const formatFieldName = (name: string): string => {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const isFieldCollected = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export function CollectionProgress({ extractedData, fieldsSchema, className }: CollectionProgressProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Exclude auto_generate fields from progress (user doesn't provide them)
  const userProvidedFields = fieldsSchema.filter((f) => !f.auto_generate);
  const requiredFields = userProvidedFields.filter((f) => f.required);
  const optionalFields = userProvidedFields.filter((f) => !f.required);
  
  const collectedRequired = requiredFields.filter((f) => isFieldCollected(extractedData?.[f.name]));
  const collectedOptional = optionalFields.filter((f) => isFieldCollected(extractedData?.[f.name]));

  const totalRequired = requiredFields.length;
  const totalCollected = collectedRequired.length;
  const progressPercent = totalRequired > 0 ? Math.round((totalCollected / totalRequired) * 100) : 0;

  if (fieldsSchema.length === 0) return null;

  return (
    <div className={cn("bg-muted/50 rounded-lg border", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/80 transition-colors rounded-lg">
          <div className="flex-1 flex items-center gap-3">
            <Progress value={progressPercent} className="flex-1 h-2" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap min-w-[100px] text-right">
              {totalCollected} de {totalRequired} campos
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-3">
          <div className="space-y-3 pt-2">
            {/* Required fields */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Campos Obrigatórios ({collectedRequired.length}/{totalRequired})
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {requiredFields.map((field) => {
                  const isCollected = isFieldCollected(extractedData?.[field.name]);
                  return (
                    <div key={field.name} className="flex items-center gap-2 py-0.5">
                      {isCollected ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "text-sm truncate",
                          isCollected ? "text-foreground" : "text-muted-foreground"
                        )}
                        title={field.description}
                      >
                        {formatFieldName(field.name)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional fields */}
            {optionalFields.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Campos Opcionais ({collectedOptional.length}/{optionalFields.length})
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {optionalFields.map((field) => {
                    const isCollected = isFieldCollected(extractedData?.[field.name]);
                    return (
                      <div key={field.name} className="flex items-center gap-2 py-0.5">
                        {isCollected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-sm truncate",
                            isCollected ? "text-foreground" : "text-muted-foreground/60"
                          )}
                          title={field.description}
                        >
                          {formatFieldName(field.name)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
