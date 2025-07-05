const axios = require("axios");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");
const config = require("../config");

/**
 * Upload image to api.betabotz.eu.org
 * Supported mimetype:
``
* - `image/jpeg`
* - `image/png`
* - `image/webp`
* - `video/mp4`
* - `video/avi`
* - `video/mkv`
* - `audio/mpeg`
* - `audio/wav`
* - `audio/ogg`
 * @param {Buffer} buffer
 * @param {String} tmp true or false
 * @param {String} apikey
 */

module.exports = async (buffer, tmp = "false", apikey = "") => {
  const { ext, mime } = (await fromBuffer(buffer)) || {};
  const form = new FormData();
  form.append("file", buffer, { filename: `tmp.${ext}`, contentType: mime });
  form.append("apikey", apikey || config.apikey_lann || config.apikey || "");
  form.append("tmp", tmp);
  try {
    const { data } = await axios.post(
      "https://api.betabotz.eu.org/api/tools/upload",
      form,
      {
        headers: form.getHeaders(),
      }
    );
    return data.result;
  } catch (error) {
    throw error;
  }
};
