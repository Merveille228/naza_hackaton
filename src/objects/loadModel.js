import { LoadingManager, SRGBColorSpace, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SPEC_GLOSS = "KHR_materials_pbrSpecularGlossiness";

/**
 * Three r152+ ne lit plus KHR_materials_pbrSpecularGlossiness, pourtant
 * requis par les GLB Mars et astronaute. On réécrit le JSON du GLB pour
 * exposer la texture diffuse en baseColor PBR, sans toucher au binaire.
 */
export function patchSpecularGlossiness(arrayBuffer) {
  const src = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 20) return arrayBuffer;

  const jsonLength = view.getUint32(12, true);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  if (jsonEnd > src.length) return arrayBuffer;

  let json;
  try {
    json = JSON.parse(new TextDecoder().decode(src.subarray(jsonStart, jsonEnd)));
  } catch {
    return arrayBuffer;
  }
  let changed = false;

  for (const material of json.materials || []) {
    const ext = material.extensions?.[SPEC_GLOSS];
    if (!ext) continue;
    changed = true;

    const pbr = material.pbrMetallicRoughness || {};
    if (ext.diffuseFactor) pbr.baseColorFactor = ext.diffuseFactor;
    if (ext.diffuseTexture) pbr.baseColorTexture = ext.diffuseTexture;

    const gloss = typeof ext.glossinessFactor === "number" ? ext.glossinessFactor : 0.4;
    const spec = ext.specularFactor || [0, 0, 0];
    pbr.roughnessFactor = ext.specularGlossinessTexture ? 0.52 : 1 - gloss;
    pbr.metallicFactor = ext.specularGlossinessTexture
      ? 0.06
      : Math.min(1, (spec[0] + spec[1] + spec[2]) / 3);

    material.pbrMetallicRoughness = pbr;
    delete material.extensions[SPEC_GLOSS];
    if (Object.keys(material.extensions).length === 0) delete material.extensions;
  }

  if (Array.isArray(json.extensionsUsed)) {
    json.extensionsUsed = json.extensionsUsed.filter((name) => name !== SPEC_GLOSS);
    if (json.extensionsUsed.length === 0) delete json.extensionsUsed;
  }
  if (Array.isArray(json.extensionsRequired)) {
    json.extensionsRequired = json.extensionsRequired.filter((name) => name !== SPEC_GLOSS);
    if (json.extensionsRequired.length === 0) delete json.extensionsRequired;
  }

  if (!changed) return arrayBuffer;

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const pad = (4 - (jsonBytes.length % 4)) % 4;
  const rest = src.subarray(jsonEnd);
  const total = 12 + 8 + jsonBytes.length + pad + rest.length;
  const out = new Uint8Array(total);
  const outView = new DataView(out.buffer);

  outView.setUint32(0, 0x46546c67, true);
  outView.setUint32(4, 2, true);
  outView.setUint32(8, total, true);
  outView.setUint32(12, jsonBytes.length + pad, true);
  outView.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonBytes.length + pad);
  out.set(rest, 20 + jsonBytes.length + pad);
  return out.buffer;
}

let bitmapSuspensions = 0;
let savedCreateImageBitmap;

function suspendImageBitmap() {
  if (bitmapSuspensions === 0 && typeof globalThis.createImageBitmap === "function") {
    savedCreateImageBitmap = globalThis.createImageBitmap;
    globalThis.createImageBitmap = undefined;
  }
  bitmapSuspensions += 1;
  return () => {
    bitmapSuspensions -= 1;
    if (bitmapSuspensions === 0 && savedCreateImageBitmap) {
      globalThis.createImageBitmap = savedCreateImageBitmap;
      savedCreateImageBitmap = undefined;
    }
  };
}

export async function loadModel(url, { onProgress, isAlive } = {}) {
  onProgress?.(0.01);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Modèle introuvable : ${url} (${response.status})`);
  }

  const lengthHeader = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  let bytes;

  if (reader) {
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (lengthHeader > 0) onProgress?.(received / lengthHeader);
      if (isAlive && !isAlive()) return null;
    }
    bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
  }

  if (isAlive && !isAlive()) return null;
  onProgress?.(1);

  const patched = patchSpecularGlossiness(bytes.buffer);
  const loader = new GLTFLoader(new LoadingManager());
  // ImageBitmapLoader échoue sur certains JPEG embarqués et laisse la planète sans texture.
  const resume = suspendImageBitmap();
  let gltf;
  try {
    gltf = await loader.parseAsync(patched, "");
  } finally {
    resume();
  }
  await applyEmbeddedAlbedo(gltf, patched);
  return gltf;
}

function glbImages(arrayBuffer) {
  const src = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) return [];
  const jsonLength = view.getUint32(12, true);
  let json;
  try {
    json = JSON.parse(new TextDecoder().decode(src.subarray(20, 20 + jsonLength)));
  } catch {
    return [];
  }
  const binHeader = 20 + jsonLength;
  if (binHeader + 8 > src.length || view.getUint32(binHeader + 4, true) !== 0x004e4942) return [];
  const bodyStart = binHeader + 8;
  return (json.images || []).map((image) => {
    if (image.bufferView === undefined) return null;
    const bufferView = json.bufferViews?.[image.bufferView];
    if (!bufferView) return null;
    const start = bodyStart + (bufferView.byteOffset || 0);
    return {
      mime: image.mimeType || "image/jpeg",
      bytes: src.slice(start, start + bufferView.byteLength),
    };
  });
}

function decodeImage({ bytes, mime }) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Texture embarquée illisible"));
    };
    image.src = url;
  });
}

async function applyEmbeddedAlbedo(gltf, arrayBuffer) {
  const images = glbImages(arrayBuffer).filter(Boolean);
  if (images.length !== 1 || !gltf?.scene) return;

  let missing = false;
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (materials.some((material) => material && !material.map?.image?.width)) missing = true;
  });
  if (!missing) return;

  const image = await decodeImage(images[0]);
  const texture = new Texture(image);
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  gltf.scene.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((material) => {
      if (!material || material.map?.image?.width) return;
      material.map = texture;
      material.color?.set?.("#ffffff");
      material.needsUpdate = true;
    });
  });
}
