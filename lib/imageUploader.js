const axios = require('axios');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

/**
 * Upload image/file ke api.betabotz.eu.org
 * @param {Buffer} buffer Buffer file yang akan diupload
 * @param {String} apikey API key dari api.betabotz.eu.org
 * @param {String} tmp 'true' atau 'false'
 * @returns {Promise<Object>} Hasil response dari API
 */
module.exports = async (buffer, apikey, tmp = 'false') => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    console.error('[IMAGEUPLOADER] Buffer kosong atau bukan buffer!');
    return null;
  }
  console.log('[IMAGEUPLOADER] Buffer length:', buffer.length);
  const fileInfo = await fromBuffer(buffer);
  console.log('[IMAGEUPLOADER] fileInfo:', fileInfo);
  if (!fileInfo || !fileInfo.ext || !fileInfo.mime) {
    console.error('[IMAGEUPLOADER] Gagal deteksi ext/mime dari buffer!', fileInfo);
    return null;
  }
  const { ext, mime } = fileInfo;
  const form = new FormData();
  form.append("file", buffer, { filename: `tmp.${ext}`, contentType: mime });
  form.append("apikey", apikey);
  form.append("tmp", tmp);
  try {
    const { data } = await axios.post("https://api.betabotz.eu.org/api/tools/upload", form, {
      headers: form.getHeaders(),
    });
    console.log('[IMAGEUPLOADER] API response:', data);
    return data.result;
  } catch (error) {
    console.error('[IMAGEUPLOADER] Upload error:', error);
    throw error;
  }
};