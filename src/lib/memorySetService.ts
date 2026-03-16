import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { MemoryImageSlot, MemorySetSummary } from '../types/memory';

const BUCKET = 'couple-media';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export const MAX_MEMORY_IMAGES = 18;
export const MAX_MEMORY_SETS = 8;

type MemorySetRow = {
  id: string;
  title: string;
  image_count: number;
  session_count: number;
  created_at: string;
};

type MemorySetImageRow = {
  id: string;
  sort_order: number;
  storage_path: string;
};

export type UploadableMemoryAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
};

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function normalizeExtension(value: string | null | undefined) {
  if (!value) return 'jpg';
  const ext = value.toLowerCase().replace('.', '');
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

function getAssetExtension(asset: UploadableMemoryAsset) {
  if (asset.fileName?.includes('.')) {
    const fromFileName = asset.fileName.split('.').pop();
    return normalizeExtension(fromFileName);
  }

  if (asset.mimeType?.includes('/')) {
    const fromMime = asset.mimeType.split('/').pop();
    return normalizeExtension(fromMime);
  }

  const match = asset.uri.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  if (match?.[1]) {
    return normalizeExtension(match[1]);
  }

  return 'jpg';
}

function getAssetContentType(asset: UploadableMemoryAsset) {
  return asset.mimeType || 'image/jpeg';
}

function buildStoragePath(
  coupleId: string,
  memorySetId: string,
  slotIndex: number,
  asset: UploadableMemoryAsset
) {
  const ext = getAssetExtension(asset);
  return `${coupleId}/memory/${memorySetId}/${slotIndex}-${Date.now()}.${ext}`;
}

async function assetToArrayBuffer(asset: UploadableMemoryAsset) {
  const file = new File(asset.uri);
  const bytes = await file.bytes();
  return bytesToArrayBuffer(bytes);
}

function replaceFileExtension(fileName?: string | null, nextExt = 'jpg') {
  if (!fileName) return `memory-${Date.now()}.${nextExt}`;
  return fileName.replace(/\.[^.]+$/, `.${nextExt}`);
}

export async function pickImagesBatch(count: number) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: count,
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets.slice(0, count);
}
export async function cropAssetWithRect(
  asset: UploadableMemoryAsset,
  rect: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  }
): Promise<UploadableMemoryAsset> {
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX: Math.max(0, Math.round(rect.originX)),
          originY: Math.max(0, Math.round(rect.originY)),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        },
      },
    ],
    {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
    fileName: replaceFileExtension(asset.fileName, 'jpg'),
  };
}
export async function getOrCreateMemorySets(): Promise<MemorySetSummary[]> {
  const { data, error } = await supabase.rpc('get_my_couple_memory_sets');

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MemorySetRow[];

  if (rows.length) {
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      imageCount: Number(row.image_count ?? 0),
      sessionCount: Number(row.session_count ?? 0),
      createdAt: row.created_at,
    }));
  }

  const { error: createError } = await supabase.rpc('create_memory_set', {
    p_title: null,
  });

  if (createError) {
    throw createError;
  }

  const { data: retryData, error: retryError } = await supabase.rpc(
    'get_my_couple_memory_sets'
  );

  if (retryError) {
    throw retryError;
  }

  return ((retryData ?? []) as MemorySetRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    imageCount: Number(row.image_count ?? 0),
    sessionCount: Number(row.session_count ?? 0),
    createdAt: row.created_at,
  }));
}

export async function createMemorySet(title?: string | null) {
  const { data, error } = await supabase.rpc('create_memory_set', {
    p_title: title ?? null,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function renameMemorySet(memorySetId: string, title: string) {
  const { data, error } = await supabase.rpc('rename_memory_set', {
    p_memory_set_id: memorySetId,
    p_title: title,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function deleteMemorySet(memorySetId: string) {
  const { data, error } = await supabase.rpc('delete_memory_set', {
    p_memory_set_id: memorySetId,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function loadMemorySlots(memorySetId: string) {
  const { data, error } = await supabase
    .from('memory_set_images')
    .select('id, sort_order, storage_path')
    .eq('memory_set_id', memorySetId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MemorySetImageRow[];
  const signedUrlMap = new Map<string, string>();

  await Promise.all(
    rows.map(async (row) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

      if (!signedError && signedData?.signedUrl) {
        signedUrlMap.set(row.id, signedData.signedUrl);
      }
    })
  );

  const rowBySlot = new Map<number, MemorySetImageRow>();
  rows.forEach((row) => {
    rowBySlot.set(row.sort_order, row);
  });

  const slots: MemoryImageSlot[] = Array.from(
    { length: MAX_MEMORY_IMAGES },
    (_, slotIndex) => {
      const row = rowBySlot.get(slotIndex);

      return {
        slotIndex,
        imageId: row?.id ?? null,
        signedUrl: row ? signedUrlMap.get(row.id) ?? null : null,
        storagePath: row?.storage_path ?? null,
      };
    }
  );

  return { memorySetId, slots };
}

export async function uploadAssetsIntoSlots(params: {
  coupleId: string;
  userId: string;
  memorySetId: string;
  slotIndexes: number[];
  assets: UploadableMemoryAsset[];
}) {
  const { coupleId, userId, memorySetId, slotIndexes, assets } = params;

  if (slotIndexes.length !== assets.length) {
    throw new Error('slotIndexes and assets must have the same length');
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('memory_set_images')
    .select('id, sort_order, storage_path')
    .eq('memory_set_id', memorySetId)
    .in('sort_order', slotIndexes);

  if (existingError) {
    throw existingError;
  }

  const existingBySlot = new Map<number, MemorySetImageRow>();
  ((existingRows ?? []) as MemorySetImageRow[]).forEach((row) => {
    existingBySlot.set(row.sort_order, row);
  });

  for (let i = 0; i < slotIndexes.length; i += 1) {
    const slotIndex = slotIndexes[i];
    const asset = assets[i];
    const existing = existingBySlot.get(slotIndex);

    const nextPath = buildStoragePath(coupleId, memorySetId, slotIndex, asset);
    const body = await assetToArrayBuffer(asset);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(nextPath, body, {
        contentType: getAssetContentType(asset),
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('memory_set_images')
        .update({
          storage_path: nextPath,
          uploaded_by: userId,
        })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }

      if (existing.storage_path && existing.storage_path !== nextPath) {
        await supabase.storage.from(BUCKET).remove([existing.storage_path]);
      }
    } else {
      const { error: insertError } = await supabase
        .from('memory_set_images')
        .insert({
          memory_set_id: memorySetId,
          couple_id: coupleId,
          storage_path: nextPath,
          uploaded_by: userId,
          sort_order: slotIndex,
        });

      if (insertError) {
        throw insertError;
      }
    }
  }
}

export async function deleteSlots(params: {
  memorySetId: string;
  slotIndexes: number[];
}) {
  const { memorySetId, slotIndexes } = params;

  if (!slotIndexes.length) return;

  const { data: rows, error } = await supabase
    .from('memory_set_images')
    .select('id, storage_path')
    .eq('memory_set_id', memorySetId)
    .in('sort_order', slotIndexes);

  if (error) {
    throw error;
  }

  const typedRows = (rows ?? []) as { id: string; storage_path: string }[];

  const paths = typedRows.map((row) => row.storage_path).filter(Boolean);

  if (paths.length) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);

    if (removeError) {
      throw removeError;
    }
  }

  const ids = typedRows.map((row) => row.id);

  if (ids.length) {
    const { error: deleteError } = await supabase
      .from('memory_set_images')
      .delete()
      .in('id', ids);

    if (deleteError) {
      throw deleteError;
    }
  }
}