import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  message: string;
  color: string;
}

export const PromoBar = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    loadAnnouncement();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          loadAnnouncement();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnnouncement = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id, message, color")
      .eq("is_active", true)
      .or(`is_immediate.eq.true,and(start_date.lte.${new Date().toISOString()},end_date.gte.${new Date().toISOString()})`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAnnouncement(data);
      setIsVisible(true);
    } else {
      setAnnouncement(null);
    }
  };

  if (!isVisible || !announcement) return null;

  return (
    <div 
      className="text-white py-2 px-4 flex items-center justify-center relative animate-fade-in"
      style={{ backgroundColor: announcement.color }}
    >
      <div className="flex items-center justify-center w-full">
        <span>{announcement.message}</span>
      </div>
      <button 
        onClick={() => setIsVisible(false)} 
        className="absolute right-4 text-white hover:text-gray-200 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};
