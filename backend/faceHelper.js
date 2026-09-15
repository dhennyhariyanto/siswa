const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-wasm');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

let isInitialized = false;

async function initFaceApi() {
  if (isInitialized) return;
  await tf.setBackend('wasm');
  await tf.ready();
  // ponytail: wasm->cpu fallback if wasm binary missing; switch to 'cpu' when Vercel OOM
  if (tf.getBackend() !== 'wasm') console.warn('[FaceAPI] wasm backend not available, using', tf.getBackend());
  const modelsPath = path.join(__dirname, 'models');

  // Load face-api models
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);

  isInitialized = true;
  console.log('FaceAPI initialized successfully.');
}

function bufferToTensor(buffer, mimeType) {
  let width, height, data;
  const mt = (mimeType || '').toLowerCase();
  if (mt.includes('png')) {
    try {
      const png = PNG.sync.read(buffer);
      width = png.width;
      height = png.height;
      data = png.data;
    } catch {
      const decoded = jpeg.decode(buffer, { useTolerantDecoding: true });
      width = decoded.width;
      height = decoded.height;
      data = decoded.data;
    }
  } else {
    try {
      const decoded = jpeg.decode(buffer, { useTolerantDecoding: true });
      width = decoded.width;
      height = decoded.height;
      data = decoded.data;
    } catch {
      // fallback png
      const png = PNG.sync.read(buffer);
      width = png.width;
      height = png.height;
      data = png.data;
    }
  }

  const numChannels = 3;
  const numPixels = width * height;
  const values = new Int32Array(numPixels * numChannels);

  for (let i = 0; i < numPixels; i++) {
    for (let c = 0; c < numChannels; c++) {
      values[i * numChannels + c] = data[i * 4 + c];
    }
  }

  return tf.tensor3d(values, [height, width, numChannels], 'int32');
}

async function getFaceDescriptor(buffer, mimeType) {
  await initFaceApi();
  let tensor;
  try {
    tensor = bufferToTensor(buffer, mimeType);
    const detection = await faceapi
      .detectSingleFace(tensor)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }
    // Return array representation of Float32Array descriptor
    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    throw error;
  } finally {
    if (tensor) {
      tensor.dispose();
    }
  }
}

module.exports = {
  getFaceDescriptor,
};