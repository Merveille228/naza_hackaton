import { Box3, Vector3 } from "three";

const box = new Box3();
const size = new Vector3();
const center = new Vector3();

export function stripUtilityNodes(root) {
  const remove = [];
  root.traverse((obj) => {
    if (obj === root) return;
    if (obj.isCamera || obj.isLight) remove.push(obj);
    else if (obj.name && /^(sun|camera|light)$/i.test(obj.name)) remove.push(obj);
  });
  remove.forEach((obj) => obj.parent?.remove(obj));
}

function limitTexture(texture, maxSize) {
  const image = texture?.image;
  if (!image?.width || !image?.height) return;
  const largest = Math.max(image.width, image.height);
  if (largest <= maxSize) return;
  const scale = maxSize / largest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  if (typeof image.close === "function") image.close();
  texture.image = canvas;
  texture.needsUpdate = true;
}

export function prepareMeshes(root, renderer) {
  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  const anisotropy = Math.min(4, maxAniso);
  const maxTexture = renderer?.capabilities?.maxTextureSize
    ? Math.min(2048, renderer.capabilities.maxTextureSize)
    : 2048;

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((material) => {
      if (!material) return;
      const maps = [material.map, material.normalMap, material.roughnessMap, material.aoMap, material.emissiveMap, material.alphaMap];
      maps.forEach((tex) => {
        if (!tex) return;
        limitTexture(tex, maxTexture);
        tex.anisotropy = anisotropy;
      });
    });
  });
}

function toParentSpace(object, point) {
  if (object.parent) object.parent.worldToLocal(point);
  return point;
}

export function fitToRadius(object, radius) {
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  box.getSize(size);
  const current = Math.max(size.x, size.y, size.z) * 0.5;
  if (!Number.isFinite(current) || current < 1e-5) return radius;
  object.scale.multiplyScalar(radius / current);
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  box.getCenter(center);
  toParentSpace(object, center);
  object.position.sub(center);
  object.updateWorldMatrix(true, true);
  return radius;
}

export function fitToHeight(object, height) {
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  box.getSize(size);
  if (size.y < 1e-5) return;
  object.scale.multiplyScalar(height / size.y);
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  box.getCenter(center);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  object.updateWorldMatrix(true, true);
}

export function fitToLength(object, length) {
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  box.getSize(size);
  const current = Math.max(size.x, size.y, size.z);
  if (current < 1e-5) return;
  object.scale.multiplyScalar(length / current);
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  box.getCenter(center);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
}
