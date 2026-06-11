import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import {
  DateCategory,
  DateGalleryCollection,
  DateSpot,
  DateVisit,
  DateVisitWithUrl,
  UploadableVisitAsset,
} from '../types/dates';

const BUCKET = 'couple-media';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const PHOTO_MAX_WIDTH = 1280;

const SPOT_COLUMNS =
  'id, couple_id, title, description, planned_date, latitude, longitude, status, visit_count, created_by, updated_by, created_at, updated_at';

const VISIT_COLUMNS =
  'id, spot_id, couple_id, visited_at, photo_path, created_by, created_at';

const CATEGORY_COLUMNS = 'id, couple_id, name, created_by, created_at';

type DateSpotRow = Omit<DateSpot, 'categoryIds'>;

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission denied');
    this.name = 'CameraPermissionError';
  }
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

async function assetToArrayBuffer(asset: UploadableVisitAsset) {
  const file = new File(asset.uri);
  const bytes = await file.bytes();
  return bytesToArrayBuffer(bytes);
}

async function compressVisitPhoto(
  asset: UploadableVisitAsset
): Promise<UploadableVisitAsset> {
  const shouldResize = (asset.width ?? PHOTO_MAX_WIDTH + 1) > PHOTO_MAX_WIDTH;

  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    shouldResize ? [{ resize: { width: PHOTO_MAX_WIDTH } }] : [],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    fileName: `visit-${Date.now()}.jpg`,
  };
}

async function createSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

async function fetchSpotCategoryIds(spotId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('date_spot_categories')
    .select('category_id')
    .eq('spot_id', spotId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as { category_id: string }[]).map(
    (row) => row.category_id
  );
}

export async function fetchDateSpots(coupleId: string): Promise<DateSpot[]> {
  const [spotsResult, linksResult] = await Promise.all([
    supabase
      .from('date_spots')
      .select(SPOT_COLUMNS)
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true }),
    supabase
      .from('date_spot_categories')
      .select('spot_id, category_id')
      .eq('couple_id', coupleId),
  ]);

  if (spotsResult.error) {
    throw spotsResult.error;
  }

  if (linksResult.error) {
    throw linksResult.error;
  }

  const categoriesBySpot = new Map<string, string[]>();
  ((linksResult.data ?? []) as { spot_id: string; category_id: string }[]).forEach(
    (row) => {
      const list = categoriesBySpot.get(row.spot_id) ?? [];
      list.push(row.category_id);
      categoriesBySpot.set(row.spot_id, list);
    }
  );

  return ((spotsResult.data ?? []) as DateSpotRow[]).map((row) => ({
    ...row,
    categoryIds: categoriesBySpot.get(row.id) ?? [],
  }));
}

export async function setSpotCategories(params: {
  spotId: string;
  coupleId: string;
  userId: string;
  categoryIds: string[];
}) {
  const { error: deleteError } = await supabase
    .from('date_spot_categories')
    .delete()
    .eq('spot_id', params.spotId);

  if (deleteError) {
    throw deleteError;
  }

  if (!params.categoryIds.length) return;

  const { error: insertError } = await supabase
    .from('date_spot_categories')
    .insert(
      params.categoryIds.map((categoryId) => ({
        spot_id: params.spotId,
        category_id: categoryId,
        couple_id: params.coupleId,
        created_by: params.userId,
      }))
    );

  if (insertError) {
    throw insertError;
  }
}

export async function createDateSpot(params: {
  coupleId: string;
  userId: string;
  title: string;
  description: string | null;
  plannedDate: string | null;
  latitude: number;
  longitude: number;
  categoryIds: string[];
}): Promise<DateSpot> {
  const { data, error } = await supabase
    .from('date_spots')
    .insert({
      couple_id: params.coupleId,
      title: params.title,
      description: params.description,
      planned_date: params.plannedDate,
      latitude: params.latitude,
      longitude: params.longitude,
      created_by: params.userId,
    })
    .select(SPOT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const spot = data as DateSpotRow;

  await setSpotCategories({
    spotId: spot.id,
    coupleId: params.coupleId,
    userId: params.userId,
    categoryIds: params.categoryIds,
  });

  return { ...spot, categoryIds: params.categoryIds };
}

export async function updateDateSpot(params: {
  spotId: string;
  coupleId: string;
  userId: string;
  title: string;
  description: string | null;
  plannedDate: string | null;
  categoryIds: string[];
}): Promise<DateSpot> {
  const { data, error } = await supabase
    .from('date_spots')
    .update({
      title: params.title,
      description: params.description,
      planned_date: params.plannedDate,
      updated_by: params.userId,
    })
    .eq('id', params.spotId)
    .select(SPOT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  await setSpotCategories({
    spotId: params.spotId,
    coupleId: params.coupleId,
    userId: params.userId,
    categoryIds: params.categoryIds,
  });

  return { ...(data as DateSpotRow), categoryIds: params.categoryIds };
}

export async function fetchDateSpot(spotId: string): Promise<DateSpot> {
  const { data, error } = await supabase
    .from('date_spots')
    .select(SPOT_COLUMNS)
    .eq('id', spotId)
    .single();

  if (error) {
    throw error;
  }

  return {
    ...(data as DateSpotRow),
    categoryIds: await fetchSpotCategoryIds(spotId),
  };
}

export async function fetchCategories(
  coupleId: string
): Promise<DateCategory[]> {
  const { data, error } = await supabase
    .from('date_categories')
    .select(CATEGORY_COLUMNS)
    .eq('couple_id', coupleId)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DateCategory[];
}

export async function createCategory(params: {
  coupleId: string;
  userId: string;
  name: string;
}): Promise<DateCategory> {
  const { data, error } = await supabase
    .from('date_categories')
    .insert({
      couple_id: params.coupleId,
      name: params.name,
      created_by: params.userId,
    })
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as DateCategory;
}

export async function renameCategory(
  categoryId: string,
  name: string
): Promise<DateCategory> {
  const { data, error } = await supabase
    .from('date_categories')
    .update({ name })
    .eq('id', categoryId)
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as DateCategory;
}

export async function deleteCategory(categoryId: string) {
  // El M:N cae por ON DELETE CASCADE; las citas no se tocan.
  const { error } = await supabase
    .from('date_categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    throw error;
  }
}

export async function fetchVisits(spotId: string): Promise<DateVisitWithUrl[]> {
  const { data, error } = await supabase
    .from('date_visits')
    .select(VISIT_COLUMNS)
    .eq('spot_id', spotId)
    .order('visited_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as DateVisit[];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      signedUrl: row.photo_path ? await createSignedUrl(row.photo_path) : null,
    }))
  );
}

export async function addVisit(params: {
  spotId: string;
  coupleId: string;
  userId: string;
  visitedAt: string;
  asset?: UploadableVisitAsset | null;
}): Promise<DateSpot> {
  const { data: visitData, error: insertError } = await supabase
    .from('date_visits')
    .insert({
      spot_id: params.spotId,
      couple_id: params.coupleId,
      visited_at: params.visitedAt,
      created_by: params.userId,
    })
    .select(VISIT_COLUMNS)
    .single();

  if (insertError) {
    throw insertError;
  }

  const visit = visitData as DateVisit;

  if (params.asset) {
    const photoPath = `${params.coupleId}/dates/${params.spotId}/${visit.id}-${Date.now()}.jpg`;

    try {
      const compressed = await compressVisitPhoto(params.asset);
      const body = await assetToArrayBuffer(compressed);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(photoPath, body, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // .select().single() hace que un update de 0 filas (p.ej. bloqueado por
      // RLS) sea un error visible en vez de un fallo mudo.
      const { error: updateError } = await supabase
        .from('date_visits')
        .update({ photo_path: photoPath })
        .eq('id', visit.id)
        .select('id')
        .single();

      if (updateError) {
        await supabase.storage.from(BUCKET).remove([photoPath]);
        throw updateError;
      }
    } catch (error) {
      // Si la foto falla, se elimina la visita para no inflar el contador.
      await supabase.from('date_visits').delete().eq('id', visit.id);
      throw error;
    }
  }

  return fetchDateSpot(params.spotId);
}

export async function removeLatestVisit(spotId: string): Promise<DateSpot> {
  const { data, error } = await supabase
    .from('date_visits')
    .select('id, photo_path')
    .eq('spot_id', spotId)
    .order('visited_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const latest = (data ?? [])[0] as
    | { id: string; photo_path: string | null }
    | undefined;

  if (!latest) {
    return fetchDateSpot(spotId);
  }

  if (latest.photo_path) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([latest.photo_path]);

    if (removeError) {
      throw removeError;
    }
  }

  const { error: deleteError } = await supabase
    .from('date_visits')
    .delete()
    .eq('id', latest.id);

  if (deleteError) {
    throw deleteError;
  }

  return fetchDateSpot(spotId);
}

export async function deleteDateSpot(spotId: string) {
  const { data, error } = await supabase
    .from('date_visits')
    .select('photo_path')
    .eq('spot_id', spotId)
    .not('photo_path', 'is', null);

  if (error) {
    throw error;
  }

  const paths = ((data ?? []) as { photo_path: string }[])
    .map((row) => row.photo_path)
    .filter(Boolean);

  // Storage no admite borrado en cascada desde SQL: se eliminan las fotos
  // primero y las visitas caen por ON DELETE CASCADE al borrar el spot.
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(chunk);

    if (removeError) {
      throw removeError;
    }
  }

  const { error: deleteError } = await supabase
    .from('date_spots')
    .delete()
    .eq('id', spotId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function fetchGalleryCollections(
  coupleId: string
): Promise<DateGalleryCollection[]> {
  const [spots, visitsResult] = await Promise.all([
    fetchDateSpots(coupleId),
    supabase
      .from('date_visits')
      .select('spot_id, photo_path, visited_at, created_at')
      .eq('couple_id', coupleId)
      .not('photo_path', 'is', null)
      .order('visited_at', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (visitsResult.error) {
    throw visitsResult.error;
  }

  const visitRows = (visitsResult.data ?? []) as {
    spot_id: string;
    photo_path: string;
  }[];

  const photosBySpot = new Map<string, string[]>();
  visitRows.forEach((row) => {
    const list = photosBySpot.get(row.spot_id) ?? [];
    list.push(row.photo_path);
    photosBySpot.set(row.spot_id, list);
  });

  const collections = spots
    .filter((spot) => photosBySpot.has(spot.id))
    .map((spot) => ({
      spot,
      paths: photosBySpot.get(spot.id) ?? [],
    }));

  return Promise.all(
    collections.map(async ({ spot, paths }) => ({
      spot,
      photoCount: paths.length,
      coverSignedUrl: paths[0] ? await createSignedUrl(paths[0]) : null,
    }))
  );
}

export async function pickVisitPhotoFromLibrary(): Promise<UploadableVisitAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}

export async function takeVisitPhoto(): Promise<UploadableVisitAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new CameraPermissionError();
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets[0];
}
