/**
 * Hover classes for service cards that reveal a project photo.
 *
 * While the photo fades in under its plum overlay, the card's text, icon
 * and arrow ring turn cream. A card without a photo keeps its light surface
 * on hover, so it must keep its normal colors: cream on that surface is
 * invisible in the light theme. Classes are written out in full so
 * Tailwind finds them.
 */
export interface OnPhotoClasses {
  title: string;
  muted: string;
  link: string;
  /** Border of the round arrow button. */
  ring: string;
}

const WITH_PHOTO: OnPhotoClasses = {
  title: "group-hover:text-sand-50 group-has-[a:focus-visible]:text-sand-50",
  muted: "group-hover:text-sand-100 group-has-[a:focus-visible]:text-sand-100",
  link: "group-hover:text-sand-50 group-has-[a:focus-visible]:text-sand-50",
  ring: "group-hover:border-sand-50/60 group-has-[a:focus-visible]:border-sand-50/60",
};

const WITHOUT_PHOTO: OnPhotoClasses = {
  title: "",
  muted: "",
  link: "",
  ring: "",
};

export function onPhotoClasses(hasPhoto: boolean): OnPhotoClasses {
  return hasPhoto ? WITH_PHOTO : WITHOUT_PHOTO;
}
