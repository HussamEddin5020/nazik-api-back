const axios = require('axios');
const { URL } = require('url');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

const SCRAPE_DO_TOKEN = '68d1d6497df94bd28b6ab7a4830c56ec552a8b271eb';
const SCRAPE_DO_BASE_URL = 'https://api.scrape.do'; // ✅ استخدام HTTPS

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

  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    return errorResponse(res, 'الرابط غير صالح. تأكد من أنه يبدأ بـ http:// أو https://', 400);
  }

  try {
    console.log(`⏳ [SCRAPER] بدء جلب بيانات المنتج من: ${url}`);
    
    // Encode URL
    const encodedUrl = encodeURIComponent(url);
    
    // Build scrape.do API URL - استخدام HTTPS
    const apiUrl = `${SCRAPE_DO_BASE_URL}/?url=${encodedUrl}&token=${SCRAPE_DO_TOKEN}`;
    
    console.log(`📡 [SCRAPER] إرسال طلب إلى: ${apiUrl}`);

    // Call scrape.do API باستخدام axios
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'shein-scraper/1.0',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
      },
      // نستقبل أي كود حالة لنعالجه يدوياً
      validateStatus: () => true,
      maxRedirects: 0,
      // لا نضع timeout - نتركه ينتظر حتى وصول الرد
    });

    console.log(`📥 [SCRAPER] Status: ${response.status}`);
    if (response.headers?.location) {
      console.log(`↪️ [SCRAPER] Location: ${response.headers.location}`);
    }

    // كشف الحجب إن حدث
    if (response.status === 403 && typeof response.data === 'string' && response.data.includes('block.opendns.com')) {
      console.error('⛔ [SCRAPER] الطلب حُجب بواسطة OpenDNS');
      return errorResponse(res, 'الطلب حُجب. غيّر DNS على الجهاز إلى 8.8.8.8/1.1.1.1 أو استخدم VPN.', 403);
    }

    if (!response.data || (typeof response.data === 'string' && response.data.length === 0)) {
      console.error(`❌ [SCRAPER] Response فارغ`);
      return errorResponse(res, 'تم استلام صفحة فارغة من الخادم', 400);
    }

    // Parse response (قد يكون HTML أو JSON)
    console.log(`🔍 [SCRAPER] بدء تحليل بيانات المنتج...`);
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    console.log(`✅ [SCRAPER] تم استلام البيانات - الطول: ${responseText.length} حرف`);

    // Parse product data from HTML/JSON
    const productData = parseProductData(responseText, url);

    if (!productData || !productData.title) {
      console.error(`❌ [SCRAPER] فشل في استخراج بيانات المنتج`);
      console.log(`📄 [SCRAPER] أول 1000 حرف من Response: ${responseText.substring(0, 1000)}`);
      return errorResponse(res, 'فشل في استخراج بيانات المنتج من الصفحة. تأكد من صحة الرابط.', 400);
    }

    console.log(`✅ [SCRAPER] تم استخراج بيانات المنتج بنجاح - العنوان: ${productData.title}`);
    successResponse(res, productData);
  } catch (error) {
    console.error('❌ [SCRAPER] Error scraping product:', error);
    console.error('❌ [SCRAPER] Error message:', error.message);
    console.error('❌ [SCRAPER] Error stack:', error.stack);
    
    if (error.response) {
      console.error(`❌ [SCRAPER] استجابة بخطأ من الخادم: ${error.response.status}`);
      const errorData = String(error.response.data).slice(0, 2000);
      console.error(`❌ [SCRAPER] Error data: ${errorData}`);
      
      if (error.response.status === 403) {
        return errorResponse(res, 'تم حجب الطلب. يرجى المحاولة لاحقاً أو استخدام VPN.', 403);
      }
      
      return errorResponse(res, `خطأ من خدمة scraping: ${error.response.status}`, error.response.status);
    }
    
    if (error.message.includes('timeout')) {
      return errorResponse(res, 'انتهت مهلة الطلب، يرجى المحاولة مرة أخرى', 408);
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return errorResponse(res, 'فشل الاتصال بخادم scraping. تأكد من الاتصال بالإنترنت.', 503);
    }
    
    return errorResponse(res, `حدث خطأ أثناء جلب بيانات المنتج: ${error.message}`, 500);
  }
});

/**
 * Parse HTML/JSON to extract product information
 * This function extracts product data from the scraped HTML or embedded JSON
 * Based on product_data.json structure
 */
function parseProductData(htmlOrJson, originalUrl) {
  try {
    let jsonData = null;
    let html = htmlOrJson;

    // Try to parse as JSON first (if response is already JSON)
    try {
      jsonData = typeof htmlOrJson === 'string' ? JSON.parse(htmlOrJson) : htmlOrJson;
    } catch (e) {
      // Not JSON, continue with HTML parsing
      jsonData = null;
    }

    // If we got JSON directly, extract from it
    if (jsonData && typeof jsonData === 'object') {
      return extractFromJsonData(jsonData, originalUrl);
    }

    // Otherwise, try to find JSON embedded in HTML (in script tags or window variables)
    // Look for product_price_info object
    let priceInfo = null;
    let sizeAttributes = null;
    let colorAttributes = null;
    let goodsInfo = null;

    // Strategy 1: Try to find product_price_info object (مطابق لـ product_data.json)
    // البحث عن product_price_info كامل في HTML
    const priceInfoPatterns = [
      // Pattern للمتغيرات في script tags
      /product_price_info["\s]*:[\s]*(\{[\s\S]{0,5000}?retailPrice[\s\S]{0,500}?\})/s,
      /"product_price_info"\s*:\s*(\{[\s\S]{0,5000}?retailPrice[\s\S]{0,500}?\})/s,
      /product_price_info\s*=\s*(\{[\s\S]{0,5000}?retailPrice[\s\S]{0,500}?\})/s,
    ];

    for (const pattern of priceInfoPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          let jsonStr = match[1].trim();
          
          // Extract salePrice.usdAmount and retailPrice.usdAmount using regex (الأكثر موثوقية)
          const salePriceMatch = jsonStr.match(/"salePrice"\s*:\s*\{[\s\S]{0,1000}?"usdAmount"\s*:\s*"([\d.]+)"/);
          const retailPriceMatch = jsonStr.match(/"retailPrice"\s*:\s*\{[\s\S]{0,1000}?"usdAmount"\s*:\s*"([\d.]+)"/);
          
          if (salePriceMatch || retailPriceMatch) {
            priceInfo = {
              salePrice: salePriceMatch ? { usdAmount: salePriceMatch[1] } : null,
              retailPrice: retailPriceMatch ? { usdAmount: retailPriceMatch[1] } : null,
            };
            console.log(`✅ [SCRAPER] تم استخراج السعر: sale=${salePriceMatch?.[1]}, retail=${retailPriceMatch?.[1]}`);
            break;
          }
          
          // Fallback: Try to extract amount directly (بدون usdAmount wrapper)
          const saleAmountMatch = jsonStr.match(/"salePrice"[\s\S]{0,500}?"amount"\s*:\s*"([\d.]+)"/);
          const retailAmountMatch = jsonStr.match(/"retailPrice"[\s\S]{0,500}?"amount"\s*:\s*"([\d.]+)"/);
          
          if (saleAmountMatch || retailAmountMatch) {
            priceInfo = {
              salePrice: saleAmountMatch ? { usdAmount: saleAmountMatch[1] } : null,
              retailPrice: retailAmountMatch ? { usdAmount: retailAmountMatch[1] } : null,
            };
            console.log(`✅ [SCRAPER] تم استخراج السعر (amount): sale=${saleAmountMatch?.[1]}, retail=${retailAmountMatch?.[1]}`);
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Strategy 2: Look for size_attributes (مطابق لـ product_data.json)
    const sizePatterns = [
      /size_attributes["\s]*:[\s]*(\{[\s\S]*?"attr_value_list"[\s\S]*?\})/s,
      /"size_attributes"\s*:\s*(\{[\s\S]*?"attr_value_list"[\s\S]*?\})/s,
      /skc_sale_attr["\s]*:[\s]*(\[[\s\S]*?\])/s,
    ];

    for (const pattern of sizePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          let jsonStr = match[1].trim();
          
          // Try to extract attr_value_list array directly using regex
          const attrListMatch = jsonStr.match(/"attr_value_list"\s*:\s*\[([\s\S]*?)\]/);
          if (attrListMatch) {
            try {
              const attrListJson = '[' + attrListMatch[1] + ']';
              const cleaned = attrListJson
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
                .replace(/,\s*}/g, '}');
              
              const parsedList = JSON.parse(cleaned);
              sizeAttributes = { attr_value_list: parsedList };
              break;
            } catch (e) {
              // Continue
            }
          }
          
          // Fallback: try full JSON parse
          const cleaned = jsonStr
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          
          const parsed = JSON.parse(cleaned);
          if (parsed.attr_value_list || Array.isArray(parsed)) {
            sizeAttributes = parsed.attr_value_list ? parsed : { attr_value_list: parsed };
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Strategy 3: Look for color_attributes
    const colorPatterns = [
      /color_attributes["\s]*:[\s]*(\{[\s\S]*?"attr_value_list"[\s\S]*?\})/s,
      /"color_attributes"\s*:\s*(\{[\s\S]*?"attr_value_list"[\s\S]*?\})/s,
    ];

    for (const pattern of colorPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          let jsonStr = match[1].trim();
          
          // Try to extract attr_value_list array directly
          const attrListMatch = jsonStr.match(/"attr_value_list"\s*:\s*\[([\s\S]*?)\]/);
          if (attrListMatch) {
            try {
              const attrListJson = '[' + attrListMatch[1] + ']';
              const cleaned = attrListJson
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
              
              const parsedList = JSON.parse(cleaned);
              colorAttributes = { attr_value_list: parsedList };
              break;
            } catch (e) {
              // Continue
            }
          }
          
          // Fallback: try full JSON parse
          const cleaned = jsonStr
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          
          const parsed = JSON.parse(cleaned);
          if (parsed.attr_value_list) {
            colorAttributes = parsed;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }

    // Build product data
    const productData = {
      title: extractTitle(html) || '',
      description: extractDescription(html) || '',
      image: extractImage(html) || '',
      product_link: originalUrl,
    };

    // Try: pricing.current_price.amount
    const pricingCurrentMatch = html.match(/"pricing"\s*:\s*\{[\s\S]*?"current_price"\s*:\s*\{[\s\S]*?"amount"\s*:\s*"([\d.]+)"/);
    if (pricingCurrentMatch) {
      productData.price = parseFloat(pricingCurrentMatch[1]);
      productData.originalPrice = productData.price;
      productData.currency = 'USD';
    }

    // Add pricing information from product_price_info
    if (!productData.price && priceInfo) {
      const salePrice = priceInfo.salePrice?.usdAmount || priceInfo.salePrice?.amount;
      const retailPrice = priceInfo.retailPrice?.usdAmount || priceInfo.retailPrice?.amount;
      
      if (salePrice) {
        productData.price = parseFloat(String(salePrice).replace(/[^0-9.]/g, ''));
      }
      
      if (retailPrice) {
        productData.originalPrice = parseFloat(String(retailPrice).replace(/[^0-9.]/g, ''));
      } else {
        productData.originalPrice = productData.price;
      }
      
      // Calculate discount
      if (productData.price && productData.originalPrice && productData.originalPrice > productData.price) {
        productData.discount = productData.originalPrice - productData.price;
        productData.discountPercent = Math.round((productData.discount / productData.originalPrice) * 100);
      }

      productData.currency = 'USD';
    }

    // Add sizes from size_attributes
    if (sizeAttributes) {
      if (sizeAttributes.attr_value_list && Array.isArray(sizeAttributes.attr_value_list)) {
        productData.sizes = sizeAttributes.attr_value_list.map(item => ({
          id: item.attr_value_id || item.id || '',
          name: item.attr_value_name || item.attr_value_name_en || '',
          localSize: item.attr_local_size_value || '',
        }));
      } else if (Array.isArray(sizeAttributes)) {
        // If it's an array directly (from skc_sale_attr)
        productData.sizes = sizeAttributes.map(item => ({
          id: item.attr_value_id || item.id || '',
          name: item.attr_value_name || item.attr_value_name_en || '',
          localSize: item.attr_local_size_value || '',
        }));
      }
    }

    // Add colors from color_attributes
    if (colorAttributes && colorAttributes.attr_value_list && Array.isArray(colorAttributes.attr_value_list)) {
      productData.colors = colorAttributes.attr_value_list.map(item => ({
        id: item.attr_value_id || item.id || '',
        name: item.attr_value_name || item.attr_value_name_en || '',
        image: item.color_img || item.image || '',
      }));
    }

    // Must have at least a title
    if (!productData.title || productData.title.length === 0) {
      console.error('[SCRAPER] لا يمكن استخراج عنوان المنتج');
      return null;
    }

    return productData;
  } catch (error) {
    console.error('Error parsing product data:', error);
    return null;
  }
}

/**
 * Extract product data directly from JSON response (if API returns JSON)
 */
function extractFromJsonData(jsonData, originalUrl) {
  try {
    const productData = {
      title: jsonData.goods_name || jsonData.title || extractTitle(JSON.stringify(jsonData)) || '',
      description: jsonData.goods_desc || jsonData.description || '',
      image: jsonData.goods_img || jsonData.image || '',
      product_link: originalUrl,
    };

    // Extract pricing from product_price_info
    if (jsonData.product_price_info) {
      const priceInfo = jsonData.product_price_info;
      const salePrice = priceInfo.salePrice?.usdAmount || priceInfo.salePrice?.amount;
      const retailPrice = priceInfo.retailPrice?.usdAmount || priceInfo.retailPrice?.amount;
      
      if (salePrice) {
        productData.price = parseFloat(String(salePrice).replace(/[^0-9.]/g, ''));
      }
      
      if (retailPrice) {
        productData.originalPrice = parseFloat(String(retailPrice).replace(/[^0-9.]/g, ''));
      } else {
        productData.originalPrice = productData.price;
      }
      
      if (productData.price && productData.originalPrice && productData.originalPrice > productData.price) {
        productData.discount = productData.originalPrice - productData.price;
        productData.discountPercent = Math.round((productData.discount / productData.originalPrice) * 100);
      }

      productData.currency = 'USD';
    }

    // Extract sizes from size_attributes
    if (jsonData.size_attributes && jsonData.size_attributes.attr_value_list) {
      productData.sizes = jsonData.size_attributes.attr_value_list.map(item => ({
        id: item.attr_value_id || item.id || '',
        name: item.attr_value_name || item.attr_value_name_en || '',
        localSize: item.attr_local_size_value || '',
      }));
    }

    // Extract colors
    if (jsonData.color_attributes && jsonData.color_attributes.attr_value_list) {
      productData.colors = jsonData.color_attributes.attr_value_list.map(item => ({
        id: item.attr_value_id || item.id || '',
        name: item.attr_value_name || item.attr_value_name_en || '',
        image: item.color_img || item.image || '',
      }));
    }

    return productData;
  } catch (error) {
    console.error('Error extracting from JSON data:', error);
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
    /goods_name["\s]*:["\s]*"([^"]+)"/,
    /<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const title = match[1].replace(/[<>]/g, '').trim();
      if (title && title.length > 0 && title !== 'SHEIN') {
        return title;
      }
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
    /goods_img["\s]*:["\s]*"([^"]+)"/,
    /<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']/i,
    /<img[^>]*class[^>]*product[^>]*src=["\']([^"\']+)["\']/i,
    /<img[^>]*id[^>]*mainImg[^>]*src=["\']([^"\']+)["\']/i,
    /<img[^>]*data-src=["\']([^"\']+)["\']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const imageUrl = match[1].trim();
      if (imageUrl && imageUrl.length > 0 && imageUrl.startsWith('http')) {
        return imageUrl;
      }
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

