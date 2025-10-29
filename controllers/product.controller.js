const fetch = require('node-fetch');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

const SCRAPE_DO_TOKEN = '68d1d6497df94bd28b6ab7a4830c56ec552a8b271eb';
const SCRAPE_DO_BASE_URL = 'http://api.scrape.do';

/**
 * @desc    Scrape product data from URL
 * @route   POST /api/v1/products/scrape
 * @access  Private (Staff with create_orders permission)
 */
exports.scrapeProduct = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return errorResponse(res, 'رابط المنتج مطلوب', 400);
  }

  try {
    // Encode URL
    const encodedUrl = encodeURIComponent(url);
    
    // Build scrape.do API URL
    const scrapeUrl = `${SCRAPE_DO_BASE_URL}/?url=${encodedUrl}&token=${SCRAPE_DO_TOKEN}`;

    // Call scrape.do API
    const response = await fetch(scrapeUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000, // 30 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse HTML to extract product data
    // Try to find embedded JSON data first (more reliable)
    const productData = parseProductData(html, url);

    if (!productData) {
      return errorResponse(res, 'فشل في استخراج بيانات المنتج من الصفحة', 400);
    }

    successResponse(res, productData);
  } catch (error) {
    console.error('Error scraping product:', error);
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return errorResponse(res, 'انتهت مهلة الطلب، يرجى المحاولة مرة أخرى', 408);
    }
    
    if (error.message.includes('HTTP error')) {
      const statusMatch = error.message.match(/status: (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 500;
      return errorResponse(res, `خطأ من خدمة scraping: ${status}`, status);
    }
    
    return errorResponse(res, 'حدث خطأ أثناء جلب بيانات المنتج', 500);
  }
});

/**
 * Parse HTML/JSON to extract product information
 * This function extracts product data from the scraped HTML or embedded JSON
 */
function parseProductData(html, originalUrl) {
  try {
    let productData = null;

    // Strategy 1: Look for embedded JSON objects in script tags
    // Try to find product_price_info, size_attributes, color_attributes
    
    // Extract product_price_info
    const priceInfoPatterns = [
      /product_price_info["\s]*:[\s]*({[^}]*salePrice[^}]*})/s,
      /"product_price_info"\s*:\s*({[^}]*salePrice[^}]*})/s,
      /product_price_info\s*=\s*({[^}]*salePrice[^}]*})/s,
    ];

    let priceInfo = null;
    for (const pattern of priceInfoPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          // Try to parse as JSON
          const jsonStr = match[1];
          priceInfo = JSON.parse(jsonStr);
          break;
        } catch (e) {
          // If JSON parsing fails, try to extract price manually
          const priceMatch = jsonStr.match(/"usdAmount"\s*:\s*"([\d.]+)"/);
          if (priceMatch) {
            priceInfo = {
              salePrice: { usdAmount: priceMatch[1] },
              retailPrice: { usdAmount: priceMatch[1] },
            };
            break;
          }
        }
      }
    }

    // Extract size_attributes
    const sizePatterns = [
      /size_attributes["\s]*:[\s]*({[^}]*attr_value_list[^}]*})/s,
      /"size_attributes"\s*:\s*({[^}]*attr_value_list[^}]*})/s,
    ];

    let sizeData = null;
    for (const pattern of sizePatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          sizeData = JSON.parse(match[1]);
          break;
        } catch (e) {
          // Try to extract sizes manually
          const sizesMatch = html.match(/attr_value_list["\s]*:[\s]*\[(.*?)\]/s);
          if (sizesMatch) {
            // This is a simplified extraction - you may need more parsing
            sizeData = { attr_value_list: [] };
          }
        }
      }
    }

    // Extract color_attributes if available
    const colorPatterns = [
      /color_attributes["\s]*:[\s]*({[^}]*attr_value_list[^}]*})/s,
      /"color_attributes"\s*:\s*({[^}]*attr_value_list[^}]*})/s,
    ];

    let colorData = null;
    for (const pattern of colorPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          colorData = JSON.parse(match[1]);
          break;
        } catch (e) {
          // Similar manual extraction for colors if needed
        }
      }
    }

    // Build product data
    productData = {
      title: extractTitle(html) || '',
      description: extractDescription(html) || '',
      image: extractImage(html) || '',
      product_link: originalUrl,
    };

    // Add pricing information
    if (priceInfo) {
      // Use pricing.current_price.amount if available, otherwise use salePrice
      const currentPrice = priceInfo.pricing?.current_price?.amount || 
                          priceInfo.salePrice?.usdAmount || 
                          priceInfo.salePrice?.amount;
      
      productData.price = currentPrice ? parseFloat(currentPrice) : null;
      productData.originalPrice = priceInfo.retailPrice?.usdAmount 
        ? parseFloat(priceInfo.retailPrice.usdAmount) 
        : (priceInfo.retailPrice?.amount ? parseFloat(priceInfo.retailPrice.amount) : productData.price);
      
      // Calculate discount if both prices exist
      if (productData.price && productData.originalPrice && productData.originalPrice > productData.price) {
        productData.discount = productData.originalPrice - productData.price;
        productData.discountPercent = Math.round((productData.discount / productData.originalPrice) * 100);
      }

      productData.currency = 'USD';
    }

    // Add sizes
    if (sizeData && sizeData.attr_value_list && Array.isArray(sizeData.attr_value_list)) {
      productData.sizes = sizeData.attr_value_list.map(item => ({
        id: item.attr_value_id || item.id,
        name: item.attr_value_name || item.attr_value_name_en || '',
        localSize: item.attr_local_size_value || '',
      }));
    }

    // Add colors
    if (colorData && colorData.attr_value_list && Array.isArray(colorData.attr_value_list)) {
      productData.colors = colorData.attr_value_list.map(item => ({
        id: item.attr_value_id || item.id,
        name: item.attr_value_name || item.attr_value_name_en || '',
        image: item.color_img || item.image || '',
      }));
    }

    return productData;
  } catch (error) {
    console.error('Error parsing product data:', error);
    return null;
  }
}

/**
 * Extract product title from HTML
 */
function extractTitle(html) {
  const patterns = [
    /<title[^>]*>(.*?)<\/title>/i,
    /<h1[^>]*class[^>]*product[^>]*>(.*?)<\/h1>/i,
    /"goods_name"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/[<>]/g, '').trim();
    }
  }

  return null;
}

/**
 * Extract product description from HTML
 */
function extractDescription(html) {
  const patterns = [
    /<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']/i,
    /"goods_desc"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract product image from HTML
 */
function extractImage(html) {
  const patterns = [
    /"goods_img"\s*:\s*"([^"]+)"/,
    /<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']/i,
    /<img[^>]*class[^>]*product[^>]*src=["\']([^"\']+)["\']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract price from goods info object
 */
function extractPrice(goodsInfo) {
  if (goodsInfo.sale_price) {
    return parseFloat(goodsInfo.sale_price);
  }
  if (goodsInfo.goods_price) {
    return parseFloat(goodsInfo.goods_price);
  }
  return null;
}

/**
 * Extract original price from goods info
 */
function extractOriginalPrice(goodsInfo) {
  if (goodsInfo.retail_price) {
    return parseFloat(goodsInfo.retail_price);
  }
  if (goodsInfo.original_price) {
    return parseFloat(goodsInfo.original_price);
  }
  return null;
}

/**
 * Extract sizes from goods info
 */
function extractSizes(goodsInfo) {
  if (goodsInfo.size_list && Array.isArray(goodsInfo.size_list)) {
    return goodsInfo.size_list.map(size => ({
      id: size.size_id || size.id,
      name: size.size_name || size.name,
    }));
  }
  return [];
}

/**
 * Extract colors from goods info
 */
function extractColors(goodsInfo) {
  if (goodsInfo.color_list && Array.isArray(goodsInfo.color_list)) {
    return goodsInfo.color_list.map(color => ({
      id: color.color_id || color.id,
      name: color.color_name || color.name,
      image: color.color_img || color.image || '',
    }));
  }
  return [];
}

