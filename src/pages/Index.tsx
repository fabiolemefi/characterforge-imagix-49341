import { useEffect } from "react";
import { PromoBar } from "../components/PromoBar";
import { Sidebar } from "../components/Sidebar";
import Header from "../components/Header";
import { CreationCard } from "../components/CreationCard";
import { QuickStartItem } from "../components/QuickStartItem";
import { FeaturedAppCard } from "../components/FeaturedAppCard";
import { ModelCard } from "../components/ModelCard";
import { Video, Paintbrush, Grid, FileText, ArrowUpRight, ArrowRight, Search } from "lucide-react";
const Index = () => {
  // Add a handler to add the logo.svg file if it's missing
  useEffect(() => {
    // Check if the logo exists, if not create a simple one
    const checkLogo = async () => {
      try {
        const response = await fetch('/logo.svg');
        if (response.status === 404) {
          console.log('Logo not found, would create one in a real app');
        }
      } catch (error) {
        console.log('Error checking logo:', error);
      }
    };
    checkLogo();
  }, []);
  return <div className="min-h-screen flex flex-col">
      <PromoBar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <main className="py-8 px-12">
              
              
              <div className="grid grid-cols-2 gap-6 mb-12">
                <CreationCard type="image" />
                <CreationCard type="storytelling" />
              </div>
              
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Quick starts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-[#1A1A1A] rounded-lg p-4 flex items-start">
                    <div className="p-3 rounded-lg bg-[#3A3600] mr-4 flex items-center justify-center">
                      <Video size={24} className="text-[#FFD426]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">Image to Video</h3>
                        <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          New
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">Bring your image to life</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-4 flex items-start">
                    <div className="p-3 rounded-lg bg-[#00361F] mr-4 flex items-center justify-center">
                      <Paintbrush size={24} className="text-[#00A67E]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Choose a Style</h3>
                      <p className="text-sm text-gray-400 mt-1">Start with a style you like</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#1A1A1A] rounded-lg p-4 flex items-start">
                    <div className="p-3 rounded-lg bg-[#360036] mr-4 flex items-center justify-center">
                      <Grid size={24} className="text-[#FF3EA5]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Explore Models</h3>
                      <p className="text-sm text-gray-400 mt-1">See 100+ Fine-tuned models</p>
                    </div>
                  </div>
                  
                  
                  
                  
                  
                  
                </div>
              </section>
              
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6">Plugins</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FeaturedAppCard title="Image to Video" subtitle="By OpenArt" imageSrc="/lovable-uploads/12cd0679-f352-498e-a6ad-9faaa1ffbec9.png" isNew />
                  <FeaturedAppCard title="Ultimate Upscale" subtitle="By OpenArt" imageSrc="/lovable-uploads/d16f3783-6af1-4327-8936-c5a50eb0cab5.png" />
                  <FeaturedAppCard title="AI Filters" subtitle="By OpenArt" imageSrc="/lovable-uploads/142dea30-a410-4e79-84d0-70189e8fcd07.png" />
                  <FeaturedAppCard title="Sketch to image" subtitle="By OpenArt" imageSrc="/lovable-uploads/b67f802d-430a-4e5a-8755-b61e10470d58.png" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                  <FeaturedAppCard title="Blend Board" subtitle="By OpenArt" imageSrc="/lovable-uploads/4255fa40-8036-4424-a210-e3bcd99754df.png" />
                  <FeaturedAppCard title="Change Facial Expression" subtitle="By OpenArt" imageSrc="/lovable-uploads/0c6db754-b805-46e5-a4b8-319a9d8fef71.png" />
                  <FeaturedAppCard title="Expand" subtitle="By OpenArt" imageSrc="/lovable-uploads/8827d443-a68b-4bd9-998f-3c4c410510e9.png" />
                  <FeaturedAppCard title="Remove background" subtitle="By OpenArt" imageSrc="/lovable-uploads/b89881e6-12b4-4527-9c22-1052b8116ca9.png" />
                </div>
                
                
              </section>
              
              
            </main>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;