// Which journal moments get a photo. Most lines get none: a photo is for a moment worth looking back on, and every one is carried to every phone
// that opens the journal and into the tank's backups. The journal line itself is always kept; only the picture is chosen and, for most, fades.
//   keep:   a life begun, a bond made, a homecoming, a time capsule. Kept for good (the newest PHOTO_KEEP_MAX of them per tank).
//   moment: something remarkable but ordinary in a living tank (an escape, a keepsake, an impression, an ink cloud). Fades after PHOTO_DAYS,
//           and at most PHOTO_DAY_MAX of them a day per tank, so the best of the day is what is kept.
export const PHOTO_KEEP_RE = /^Time capsule: day|hatched|gave birth|tiny seahorses|have paired up|pair for life|bonded as companions|became best friends|is all grown up|reached adulthood|came back! The turtle you raised|has decided to stay|is staying in the tank|the tank's first animal|their own octopus/i;
export const PHOTO_MOMENT_RE = /climbed out over the top|squeezed through the gap|slid up the glass|went over the top|came back holding|came home with|brought back a|came back with a|found a painted shard|passed for a lionfish|drifted about like a jellyfish|like a sea snake|flat as a sole|pretending to be one|took on .*'s colors|cloud of ink|seemed to vanish|worked out the puzzle|caught its first crab|moved into an? .*shell|courted at dawn|is visiting the tank|is back again|ancient spiral shell|old whelk shell|cleaning station|touched arms|stood up tall and went dark/i;
export const PHOTO_DAYS = 5, PHOTO_DAY_MAX = 3, PHOTO_KEEP_MAX = 60;
export const photoKind = (text) => (PHOTO_KEEP_RE.test(text ?? '') ? 'keep' : PHOTO_MOMENT_RE.test(text ?? '') ? 'moment' : null);
// a photo as a small image: WebP where the phone can make it (about half the size of a JPEG of the same look), otherwise JPEG; null if it
// cannot be made small enough
export function encodePhoto(canvas, max = 46000) {
  for (const type of ['image/webp', 'image/jpeg']) {
    let q = 0.74, img = canvas.toDataURL(type, q); if (!img.startsWith(`data:${type}`)) continue;      // (a browser that cannot make WebP hands back a PNG instead)
    while (img.length > max && q > 0.4) img = canvas.toDataURL(type, (q -= 0.08));
    if (img.length <= max) return img;
  }
  return null;
}
