// Exercise images/gifs are stored in five resolutions, smallest → largest.
// Serving the right one per usage instead of always shipping 1080p is the main
// bandwidth (and S3/CloudFront cost) lever: a 48px entry-row thumbnail needs a
// fraction of a full-screen TV demo.
//
// The URL arrays are ordered to match RESOLUTIONS below (see the exercise
// import script), so a size maps directly to an array index.
export const EXERCISE_MEDIA_RESOLUTIONS = [180, 360, 480, 720, 1080] as const;

export type ExerciseMediaSize =
  | 'thumb' // 180 — tiny avatars / entry & pick rows (~48px)
  | 'small' // 360 — hover previews, related-exercise cards (~112px)
  | 'medium' // 480 — list & picker grids
  | 'large' // 720 — exercise detail page
  | 'full'; // 1080 — TV walls

const SIZE_INDEX: Record<ExerciseMediaSize, number> = {
  thumb: 0,
  small: 1,
  medium: 2,
  large: 3,
  full: 4,
};

// Picks the URL closest to the requested size, falling back to the largest
// available variant (then nothing) so an exercise with missing resolutions
// still renders something.
export function exerciseMedia(
  urls: string[] | null | undefined,
  size: ExerciseMediaSize,
): string | undefined {
  if (!urls || urls.length === 0) return undefined;
  return urls[SIZE_INDEX[size]] ?? urls[urls.length - 1];
}
