import { supabase } from './supabase';
import {
  CountdownCoupleMember,
  VisualGender,
  WishlistItem,
  WishlistPriority,
  WishlistStatus,
} from '../types/countdown';

type CountdownMemberRow = CountdownCoupleMember;
type WishlistItemRow = WishlistItem;

export async function fetchMyActiveCoupleCountdownMembers() {
  const { data, error } = await supabase.rpc(
    'get_my_active_couple_countdown_members'
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as CountdownMemberRow[];
}

export async function fetchWishlistItems(params: {
  coupleId: string;
  ownerUserId: string;
}) {
  const { coupleId, ownerUserId } = params;

  const { data, error } = await supabase
    .from('wishlist_items')
    .select(
      'id, couple_id, owner_user_id, title, description, url, estimated_price, currency, priority, status, created_at, updated_at'
    )
    .eq('couple_id', coupleId)
    .eq('owner_user_id', ownerUserId)
    .neq('status', 'archived')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as WishlistItemRow[];
}

export async function createWishlistItem(params: {
  coupleId: string;
  ownerUserId: string;
  title: string;
  description?: string | null;
  url?: string | null;
  estimatedPrice?: number | null;
  currency?: string;
  priority?: WishlistPriority;
}) {
  const {
    coupleId,
    ownerUserId,
    title,
    description = null,
    url = null,
    estimatedPrice = null,
    currency = 'CLP',
    priority = 'medium',
  } = params;

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      couple_id: coupleId,
      owner_user_id: ownerUserId,
      title,
      description,
      url,
      estimated_price: estimatedPrice,
      currency,
      priority,
      status: 'active',
    })
    .select(
      'id, couple_id, owner_user_id, title, description, url, estimated_price, currency, priority, status, created_at, updated_at'
    )
    .single();

  if (error) {
    throw error;
  }

  return data as WishlistItemRow;
}

export async function updateWishlistItemStatus(
  itemId: string,
  status: WishlistStatus
) {
  const { data, error } = await supabase
    .from('wishlist_items')
    .update({ status })
    .eq('id', itemId)
    .select(
      'id, couple_id, owner_user_id, title, description, url, estimated_price, currency, priority, status, created_at, updated_at'
    )
    .single();

  if (error) {
    throw error;
  }

  return data as WishlistItemRow;
}

export async function archiveWishlistItem(itemId: string) {
  return updateWishlistItemStatus(itemId, 'archived');
}

export async function updateMyProfileDetails(params: {
  userId: string;
  birthDate: string | null;
  visualGender: VisualGender;
}) {
  const { userId, birthDate, visualGender } = params;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      birth_date: birthDate,
      visual_gender: visualGender,
    })
    .eq('id', userId)
    .select('id, birth_date, visual_gender')
    .single();

  if (error) {
    throw error;
  }

  return data;
}