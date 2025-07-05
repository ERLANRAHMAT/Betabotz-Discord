const fetch = require('node-fetch');

async function fetchWithLog(url, options = {}, context = "") {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const ms = Date.now() - start;
    if (res.ok) {
      console.log(`[API-FETCH][SUCCESS]${context ? ` [${context}]` : ""} ${url} (${res.status}) in ${ms}ms`);
    } else {
      console.warn(`[API-FETCH][FAIL]${context ? ` [${context}]` : ""} ${url} (${res.status}) in ${ms}ms`);
    }
    return res;
  } catch (err) {
    const ms = Date.now() - start;
    console.error(`[API-FETCH][ERROR]${context ? ` [${context}]` : ""} ${url} in ${ms}ms:`, err);
    throw err;
  }
}

module.exports = fetchWithLog;