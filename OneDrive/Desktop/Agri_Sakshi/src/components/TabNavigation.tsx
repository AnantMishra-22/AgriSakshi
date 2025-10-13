import { cn } from "@/lib/utils";
import { Home, Cloud, Mountain, Wheat, Settings, TrendingUp, User, Bug } from "lucide-react";
import { useLanguage } from "@/services/languageService";

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabs: Tab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'climate', label: 'Climate', icon: Cloud },
  { id: 'soil', label: 'Soil', icon: Mountain },
  { id: 'crop', label: 'Crops', icon: Wheat },
  { id: 'market', label: 'Market', icon: TrendingUp },
  { id: 'disease-detection', label: 'Disease Detection', icon: Bug },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const { t } = useLanguage();
  
  return (
    <nav className="bg-card border-t border-border">
      <div className="flex justify-around items-center px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center px-2 py-2 rounded-lg transition-all duration-200",
                "min-w-[50px] text-xs font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-4 h-4 mb-1", isActive && "drop-shadow-sm")} />
              <span className="text-[10px]">{t(tab.id)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};