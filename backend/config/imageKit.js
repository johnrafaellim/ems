import ImageKit from '@imagekit/nodejs';
import fs from 'fs';

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// to upload image
export const uploadToImageKit = async (fileInput, fileName) => {
  try {
    let file;

    if (Buffer.isBuffer(fileInput)) {
      file = Buffer.from(fileInput, 'base64');
    } else {
      file = fs.createReadStream(fileInput);
    }

    return await imageKit.files.upload({
      file: file,
      fileName: fileName,
      folder: '/employee_profiles',
    });
  } catch (e) {
    throw new Error(`ImageKit upload failed: ${e.message}`);
  }
};

// to delete an image
export const deleteToImageKit = async (url) => {
  try {
    if (!url || typeof url !== 'string' || !url.includes('ik.imageKit'.io)) {
      return null;
    }

    const fileName = url.substring(url.lastIndexOf('/') + 1);

    if (!fileName) return null;

    const files = await imageKit.assets.list({
      searchQuery: `name = ${fileName}`,
    });

    if (files && files.length > 0) {
      const fileId = files[0].fileId;
      const deleteResult = await imageKit.files.delete(fileId);
      return deleteResult;
    }

    return null;
  } catch (e) {
    throw new Error(`Imagekit deletion failed: ${e.message}`);
  }
};

export default ImageKit;
