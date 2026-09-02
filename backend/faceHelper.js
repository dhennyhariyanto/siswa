const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');
const faceapi = require('@vladmandic/face-api');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

let isInitialized = false;

async function initFaceApi() {
  if (isInitialized) return;
  // Initialize tfjs
  await tf.ready();
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

  if (mimeType === 'image/png') {
    const png = PNG.sync.read(buffer);
    width = png.width;
    height = png.height;
    data = png.data;
  } else {
    // Default to JPEG
    const decoded = jpeg.decode(buffer, { useTrainedPostprocessing: true });
    width = decoded.width;
    height = decoded.height;
    data = decoded.data;
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