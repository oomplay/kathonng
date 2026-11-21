export const MAX_OWNER_NAME_LENGTH = 40
export const MAX_WISH_TEXT_LENGTH = 280

/** Maximum size of the final image sent to Supabase Storage. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

/** Original device photos may be larger; they are compressed before upload. */
export const MAX_SOURCE_PHOTO_BYTES = 12 * 1024 * 1024

export const ALLOWED_PHOTO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
] as const
