// Data file utility functions

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Read a JSON data file
 * @param {string} filename - Name of the file (e.g., 'jobs.json')
 * @returns {Promise<Array|Object>} Parsed JSON data
 */
async function readDataFile(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

/**
 * Write data to a JSON file
 * @param {string} filename - Name of the file (e.g., 'jobs.json')
 * @param {Array|Object} data - Data to write
 */
async function writeDataFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
    throw error;
  }
}

module.exports = {
  readDataFile,
  writeDataFile,
  ensureDataDir,
  DATA_DIR
};
