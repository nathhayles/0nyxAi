export const uploadsStore = {
  items: []
};

export function addUploadPermanent(media) {
  uploadsStore.items.push(media);
}

export function getUploads() {
  return uploadsStore.items;
}

export function clearUploads() {
  uploadsStore.items.length = 0;
}
