const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_SERVICE_URL = process.env.PYTHON_OCR_URL || 'http://127.0.0.1:5001';

/**
 * Extracts OCR tokens, packaging blocks, and statutory compliance from multi-panel image files (Front + 1-3+ Secondary Panels).
 */
async function processScanWithPython(frontPath, backPaths = [], rulebook = []) {
  try {
    const form = new FormData();
    if (frontPath && fs.existsSync(frontPath)) {
      form.append('front_image', fs.createReadStream(frontPath));
    }
    const pathsArray = Array.isArray(backPaths) ? backPaths : (backPaths ? [backPaths] : []);
    pathsArray.forEach((bPath, idx) => {
      if (bPath && fs.existsSync(bPath)) {
        form.append(`back_image_${idx}`, fs.createReadStream(bPath));
      }
    });
    form.append('rules_json', JSON.stringify(rulebook.filter((rule) => rule.active)));

    const response = await axios.post(`${PYTHON_SERVICE_URL}/extract`, form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 180000
    });

    if (response.data && response.data.status === 'success') {
      return {
        success: true,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'Python OCR pipeline failed to process packaging image.'
      };
    }
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || 'Python OCR microservice request failed.';
    console.error(`[Python OCR Service Error] ${errMsg}`);
    return {
      success: false,
      error: errMsg
    };
  }
}

/**
 * Executes multi-spectral forensic anti-counterfeit analysis across one or multiple packaging panels.
 */
async function processCounterfeitWithPython(frontPath, secondaryPaths = []) {
  try {
    const form = new FormData();
    form.append('front_image', fs.createReadStream(frontPath));

    if (Array.isArray(secondaryPaths)) {
      secondaryPaths.forEach((secPath, idx) => {
        if (secPath && fs.existsSync(secPath)) {
          form.append(`back_image_${idx}`, fs.createReadStream(secPath));
        }
      });
    }

    const response = await axios.post(`${PYTHON_SERVICE_URL}/counterfeit/analyze`, form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 180000
    });

    if (response.data && response.data.counterfeit_metrics) {
      return {
        success: true,
        data: {
          ...response.data.counterfeit_metrics,
          brandMetrics: response.data.brandMetrics || response.data.brand_metrics,
          barcode: response.data.barcode,
          panels: response.data.panels,
          productName: response.data.product_name || response.data.brandMetrics?.brandDetected || 'Scanned Packaged Commodity'
        }
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'Forensic analysis failed to produce metrics.'
      };
    }
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || 'Python Counterfeit microservice request failed.';
    console.error(`[Python Counterfeit Service Error] ${errMsg}`);
    return {
      success: false,
      error: errMsg
    };
  }
}

/**
 * Processes live video stream frame for real-time OCR and object detection.
 */
async function processLiveStreamWithPython(fileBuffer, filename = 'frame.jpg') {
  try {
    const form = new FormData();
    form.append('image', fileBuffer, { filename });

    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/v2/cv/live-stream-ocr`, form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 10000
    });

    if (response.data && response.data.status === 'success') {
      return response.data;
    }
  } catch (err) {
    // Return empty frame data on transient video stream drop
  }

  return {
    status: 'success',
    is_blurry: false,
    focus_measure: 0.0,
    object: { detected: false, box: [0, 0, 0, 0], label: 'Aligning' },
    barcode: null,
    features: [],
    brand_name: 'Aligning Package...',
    statutory_count: 0,
    statutory_categories: []
  };
}

module.exports = {
  processScanWithPython,
  processCounterfeitWithPython,
  processLiveStreamWithPython,
  PYTHON_SERVICE_URL
};
