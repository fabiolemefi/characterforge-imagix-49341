export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
}

export interface Typography {
  title: TypographyStyle;
  subtitle: TypographyStyle;
  body: TypographyStyle;
}

export interface BrandColor {
  name: string;
  hex: string;
}

export interface BrandKit {
  id: string;
  name: string;
  typography: Typography;
  color_palette: BrandColor[];
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandKitFolder {
  id: string;
  brand_kit_id: string;
  parent_id: string | null;
  name: string;
  position: number;
  created_at: string;
}

export interface BrandKitAsset {
  id: string;
  brand_kit_id: string;
  folder_id: string | null;
  name: string;
  file_url: string;
  file_type: string;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
}
