const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');
const logger = require('./logger');

const OCR_WHITELIST = "UGRugr0123456789/IDNumber: ";

/**
 * Robustly call tesseract binary
 */
const runTesseract = async (imageBuffer, config) => {
  const tesseractPath = process.env.TESSERACT_CMD || 'tesseract';
  const psm = config.psm || 6;
  const lang = config.lang || 'eng';
  
  // Use system temp directory for more reliability across OS/Docker
  const tmpPath = path.join(os.tmpdir(), `ocr_tmp_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`);
  
  try {
    fs.writeFileSync(tmpPath, imageBuffer);
    
    // Construction of command - be careful with quoting on different OS
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? `"${tesseractPath}"` : tesseractPath;
    const command = `${cmd} "${tmpPath}" stdout -l ${lang} --oem 3 --psm ${psm}`;
    
    // On Windows, some tesseract outputs go to stderr but aren't errors
    const { stdout, stderr } = await execAsync(command);
    
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    return stdout || "";
  } catch (error) {
    logger.error(`Tesseract Execution Failed. Cmd: ${error.cmd}`, error);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    if (error.stdout) return error.stdout;
    throw error;
  }
};

const tesseractConfig = {
  lang: "eng",
  oem: 3,
  psm: 6,
};

const normalizeOcrText = (text) => {
  if (!text) return "";
  let cleaned = text.toLowerCase();
  
  // Replace characters that are commonly misread in IDs
  cleaned = cleaned.replace(/\s+/g, ""); // Remove all whitespace
  cleaned = cleaned.replace(/-/g, "/");
  cleaned = cleaned.replace(/\\/g, "/");
  cleaned = cleaned.replace(/\|/g, "/"); // Vertical bars are often slashes
  cleaned = cleaned.replace(/!/g, "1");
  cleaned = cleaned.replace(/l/g, "1");
  cleaned = cleaned.replace(/i/g, "1");
  cleaned = cleaned.replace(/s/g, "5");
  cleaned = cleaned.replace(/o/g, "0");
  cleaned = cleaned.replace(/z/g, "2");
  // Don't blindly replace 'g' with '9' here as it's part of 'ugr'
  // Instead, handle it in the regex or specifically
  return cleaned;
};

/**
 * Smart similarity check using Levenshtein distance.
 * Allows for minor differences (typos, misreads, missing chars)
 */
const isSimilar = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;

  const lenA = a.length;
  const lenB = b.length;
  
  // Create a 2D matrix
  const matrix = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  const distance = matrix[lenA][lenB];
  
  // Stricter threshold: only allow 1 difference for IDs up to 10 chars
  // This prevents 31038 from matching 31337 (which have 2 differences)
  const threshold = b.length <= 10 ? 1 : 2;
  return distance <= threshold;
};

const checkTextForId = (normalized, expected) => {
  if (!normalized) return { res: null, isExact: false };

  // Helper to normalize the expected ID for comparison
  const normExpected = expected ? expected.toLowerCase().replace(/[^a-z0-9]/g, "") : null;

  // Regex 1: Match 'ugr' or 'u9r' or just 'u' + 2 chars, then 4-6 digits, then 2 digits
  // Even more lenient: allow 'g' and 'r' to be replaced by any 2 characters
  const pattern = /([u][a-z0-9]{2})[^0-9]*?(\d{4,6})[^0-9]*?(\d{2})/;
  const match = normalized.match(pattern);
  
  if (match) {
    const candidate = `ugr/${match[2]}/${match[3]}`;
    if (expected) {
      const cleanCandidate = candidate.replace(/[^a-z0-9]/g, "");
      if (cleanCandidate === normExpected || isSimilar(cleanCandidate, normExpected)) {
        return { res: candidate, isExact: true };
      }
    }
    return { res: candidate, isExact: false };
  }

  // Regex 2 (Leniency): Digit fallback
  if (expected) {
    const expectedNums = expected.match(/\d+/g);
    if (expectedNums && expectedNums.length >= 2) {
      const idNum = expectedNums[0];
      const yearNum = expectedNums[1];
      
      // Look for the ID number digits with high tolerance
      // Find all sequences of 3-7 digits
      const allDigits = normalized.match(/\d{3,7}/g) || [];
      logger.info(`Detected digits for fallback: ${allDigits.join(', ')}`);

      for (const candidateNum of allDigits) {
        // If it exactly matches or is very similar
        if (candidateNum === idNum || isSimilar(candidateNum, idNum)) {
          // If the year is also somewhere in the text
          if (normalized.includes(yearNum)) {
            return { res: expected.toLowerCase(), isExact: true };
          }
          // Even if the year is missing, if the ID number is exact, let's call it a match
          if (candidateNum === idNum) {
            return { res: expected.toLowerCase(), isExact: true };
          }
        }
      }
    }
  }

  return { res: null, isExact: false };
};

const extractIdMatch = async (imageBuffer, expectedId) => {
  const startTime = Date.now();
  const candidates = [];
  const expected = expectedId ? expectedId.trim().toLowerCase() : null;

  try {
    // 1. Preprocessing Strategy A: High Contrast + Sharp
    // High Contrast Preprocessing
    const imageA = await sharp(imageBuffer)
      .resize(1100, null, { withoutEnlargement: true, fit: 'inside' })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    // Threshold Preprocessing
    const imageB = await sharp(imageBuffer)
      .resize(1100, null, { withoutEnlargement: true, fit: 'inside' })
      .grayscale()
      .threshold(130)
      .toBuffer();

    // RUN PRIMARY PASSES IN PARALLEL
    const results = await Promise.all([
      runTesseract(imageA, { ...tesseractConfig, psm: 3 }),
      runTesseract(imageB, { ...tesseractConfig, psm: 6 })
    ]);

    // Check results from parallel passes
    for (const text of results) {
      const normalized = normalizeOcrText(text);
      const { res, isExact } = checkTextForId(normalized, expected);
      if (isExact) return { extracted_id: res, matches: true };
      if (res && !candidates.includes(res)) candidates.push(res);
    }

    // FALLBACK: ROTATION (Only if exact match not found above)
    const angles = [90, 270];
    for (const angle of angles) {
      if (Date.now() - startTime > 15000) break; // Speed safety
      const rotatedImage = await sharp(imageBuffer)
        .resize(1000, null, { withoutEnlargement: true, fit: 'inside' })
        .rotate(angle)
        .grayscale()
        .normalize()
        .toBuffer();

      const text = await runTesseract(rotatedImage, { ...tesseractConfig, psm: 6 });
      const normalized = normalizeOcrText(text);
      const { res, isExact } = checkTextForId(normalized, expected);
      if (isExact) return { extracted_id: res, matches: true };
      if (res && !candidates.includes(res)) candidates.push(res);
    }

    if (candidates.length > 0) {
      // Check if any candidate matches expected (regex 1 found it)
      if (expected) {
        if (candidates.map(c => c.toLowerCase()).includes(expected)) {
          return { extracted_id: expected, matches: true };
        }
      }
      return { extracted_id: candidates[0], matches: false };
    }

    return { extracted_id: null, matches: false };
  } catch (error) {
    console.error("OCR Engine Error:", error);
    throw error;
  }
};

module.exports = { extractIdMatch };
