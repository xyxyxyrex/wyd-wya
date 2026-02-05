/**
 * Extracts the dominant color from an image URL
 * Uses canvas to sample pixels and find the most common color
 */

export const extractDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Use a small size for performance
      const size = 50;
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(img, 0, 0, size, size);

      try {
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        // Sample colors and find dominant one
        const colorCounts = {};
        let maxCount = 0;
        let dominantColor = { r: 30, g: 30, b: 30 }; // Default dark

        for (let i = 0; i < pixels.length; i += 16) {
          // Sample every 4th pixel
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a < 128) continue; // Skip transparent pixels

          // Quantize colors to reduce variations (group similar colors)
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;

          // Skip very dark or very light colors for more vibrant results
          const brightness = (qr + qg + qb) / 3;
          if (brightness < 30 || brightness > 225) continue;

          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;

          if (colorCounts[key] > maxCount) {
            maxCount = colorCounts[key];
            dominantColor = { r: qr, g: qg, b: qb };
          }
        }

        resolve(dominantColor);
      } catch (e) {
        // CORS or other error - return default
        resolve({ r: 30, g: 30, b: 30 });
      }
    };

    img.onerror = () => {
      resolve({ r: 30, g: 30, b: 30 });
    };

    img.src = imageUrl;
  });
};

/**
 * Creates a gradient background style from a color
 */
export const createGradientFromColor = (color, opacity = 0.85) => {
  const { r, g, b } = color;

  // Create a darker version for the gradient
  const darkR = Math.max(0, r - 40);
  const darkG = Math.max(0, g - 40);
  const darkB = Math.max(0, b - 40);

  return `linear-gradient(135deg, 
    rgba(${r}, ${g}, ${b}, ${opacity}) 0%, 
    rgba(${darkR}, ${darkG}, ${darkB}, ${opacity}) 100%)`;
};

/**
 * Determines if text should be light or dark based on background color
 */
export const getContrastTextColor = (color) => {
  const { r, g, b } = color;
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
};
