import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { MemoryImageSlot } from '../types/memory';

const BUCKET = 'couple-media';
export const MAX_MEMORY_IMAGES = 18;

type MemorySetRow = {
  id: string;
};

type MemorySetImageRow = {
  id: string;
  sort_order: number;
  storage_path: string;
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

function getAssetExtension(asset: ImagePicker.ImagePickerAsset) {
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

function getAssetContentType(asset: ImagePicker.ImagePickerAsset) {
  return asset.mimeType || 'image/jpeg';
}

function buildStoragePath(
  coupleId: string,
  memorySetId: string,
  slotIndex: number,
  asset: ImagePicker.ImagePickerAsset
) {
  const ext = getAssetExtension(asset);
  return `${coupleId}/memory/${memorySetId}/${slotIndex}-${Date.now()}.${ext}`;
}

async function assetToArrayBuffer(asset: ImagePicker.ImagePickerAsset) {
  const file = new File(asset.uri);
  const bytes = await file.bytes();
  return bytesToArrayBuffer(bytes);
}

export async function ensureMainMemorySet(
  coupleId: string,
  userId: string
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('memory_sets')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<MemorySetRow>();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from('memory_sets')
    .insert({
      couple_id: coupleId,
      title: 'Set principal',
      is_active: true,
      created_by: userId,
    })
    .select('id')
    .single<MemorySetRow>();

  if (createError) {
    throw createError;
  }

  return created.id;
}

export async function loadMemorySlots(
  coupleId: string,
  userId: string
): Promise<{ memorySetId: string; slots: MemoryImageSlot[] }> {
  const memorySetId = await ensureMainMemorySet(coupleId, userId);

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
        .createSignedUrl(row.storage_path, 60 * 60);

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
  assets: ImagePicker.ImagePickerAsset[];
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

  const paths = typedRows
    .map((row) => row.storage_path)
    .filter(Boolean);

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