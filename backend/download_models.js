const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
];

function download(file) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, file);
    const fileStream = fs.createWriteStream(filePath);
    console.log(`Downloading ${file}...`);
    https.get(baseUrl + file, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${file}: ${response.statusCode}`));
        return;
      }
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${file}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const file of files) {
    try {
      await download(file);
    } catch (err) {
      console.error(err);
    }
  }
  console.log('All models downloaded successfully.');
}

main();