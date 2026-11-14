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
  const loader = new GLTFLoader();
  return loader.parseAsync(patched, "");
}
