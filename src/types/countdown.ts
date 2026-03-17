export type VisualGender = 'male' | 'female' | null;

export type CountdownSelection = 'anniversary' | string;

export type CountdownCoupleMember = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_path: string | null;
  nickname: string | null;
  birth_date: string | null;
  visual_gender: VisualGender;
  role: 'owner' | 'member';
  joined_at: string;
  is_me: boolean;
};

export type CountdownTimeParts = {
  totalDays: number;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isPast: boolean;
};

export type WishlistPriority = 'low' | 'medium' | 'high';
export type WishlistStatus = 'active' | 'purchased' | 'archived';

export type WishlistItem = {
  id: string;
  couple_id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  url: string | null;
  estimated_price: number | null;
  currency: string;
  priority: WishlistPriority;
  status: WishlistStatus;
  created_at: string;
  updated_at: string;
};