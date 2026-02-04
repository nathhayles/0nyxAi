let brands = [
  { id: "b1", name: "Default Brand" }
];

let selectedBrandId = null;
let listeners = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function getBrands() {
  return brands;
}

export function getSelectedBrand() {
  return brands.find(b => b.id === selectedBrandId) || null;
}

export function assignBrandToProject(id) {
  selectedBrandId = id;
  notify();
}

export function subscribeBrand(fn) {
  listeners.push(fn);
}
