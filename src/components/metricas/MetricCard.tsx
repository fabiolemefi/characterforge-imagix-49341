import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  name: string;
  value: string | number;
  diff?: number;
  diffPercentage?: number;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function MetricCard({ 
  name, 
  value, 
  diff, 
  diffPercentage, 
  icon,
  isLoading 
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      // Check if it's a currency value (cost, CPA, CPC)
      const lowerName = name.toLowerCase();
      if (lowerName.includes("custo") || lowerName.includes("cpa") || lowerName.includes("cpc") || lowerName.includes("cost")) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(val);
      }
      // Check if it's a percentage
      if (lowerName.includes("ctr") || lowerName.includes("taxa") || lowerName.includes("rate")) {
        return `${val.toFixed(2)}%`;
      }
      // Default number formatting
      return new Intl.NumberFormat("pt-BR").format(val);
    }
    return val;
  };

  const getTrendInfo = () => {
    if (diffPercentage === undefined || diffPercentage === null) {
      return { icon: <Minus className="h-3 w-3" />, color: "text-muted-foreground", text: "—" };
    }
    
    const isPositive = diffPercentage > 0;
    const isNeutral = diffPercentage === 0;
    
    // For cost metrics, lower is better
    const lowerName = name.toLowerCase();
    const lowerIsBetter = lowerName.includes("custo") || lowerName.includes("cpa") || lowerName.includes("cpc") || lowerName.includes("cost");
    
    if (isNeutral) {
      return { icon: <Minus className="h-3 w-3" />, color: "text-muted-foreground", text: "0%" };
    }
    
    const isGood = lowerIsBetter ? !isPositive : isPositive;
    
    return {
      icon: isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />,
      color: isGood ? "text-green-600" : "text-red-600",
      text: `${isPositive ? "+" : ""}${diffPercentage.toFixed(1)}%`,
    };
  };

  const trend = getTrendInfo();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-muted rounded w-24 mb-3" />
          <div className="h-8 bg-muted rounded w-32 mb-2" />
          <div className="h-4 bg-muted rounded w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {name}
          </span>
        </div>
        <div className="text-2xl font-bold text-foreground mb-1">
          {formatValue(value)}
        </div>
        <div className={cn("flex items-center gap-1 text-sm", trend.color)}>
          {trend.icon}
          <span>{trend.text}</span>
          <span className="text-muted-foreground text-xs">vs. período anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}
