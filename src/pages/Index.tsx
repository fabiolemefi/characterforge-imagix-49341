import { Helmet } from "react-helmet";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Index = () => {
  const { data: settings } = useSiteSettings();

  return (
    <>
      <Helmet>
        {settings?.og_title && <title>{settings.og_title}</title>}
        {settings?.og_title && <meta property="og:title" content={settings.og_title} />}
        {settings?.og_description && <meta property="og:description" content={settings.og_description} />}
        {settings?.og_image_url && <meta property="og:image" content={settings.og_image_url} />}
        <meta property="og:type" content="website" />
        {settings?.favicon_url && <link rel="icon" href={settings.favicon_url} />}
        <meta name="twitter:card" content={settings?.twitter_card || "summary_large_image"} />
        {settings?.og_title && <meta name="twitter:title" content={settings.og_title} />}
        {settings?.og_description && <meta name="twitter:description" content={settings.og_description} />}
        {settings?.og_image_url && <meta name="twitter:image" content={settings.og_image_url} />}
      </Helmet>
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground text-lg text-center px-4">
          Em breve coisas muito bonitas aqui, mas por enquanto tem nada não.
        </p>
      </div>
    </>
  );
};

export default Index;
