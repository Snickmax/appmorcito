export type DateSpotStatus = 'pendiente' | 'realizada';

export type DateSpot = {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  planned_date: string | null;
  latitude: number;
  longitude: number;
  status: DateSpotStatus;
  visit_count: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Enriquecido client-side desde date_spot_categories.
  categoryIds: string[];
};

export type DateCategory = {
  id: string;
  couple_id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type DateVisit = {
  id: string;
  spot_id: string;
  couple_id: string;
  visited_at: string;
  photo_path: string | null;
  created_by: string;
  created_at: string;
};

export type DateVisitWithUrl = DateVisit & {
  signedUrl: string | null;
};

export type DateGalleryCollection = {
  spot: DateSpot;
  photoCount: number;
  coverSignedUrl: string | null;
};

export type UploadableVisitAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
};
