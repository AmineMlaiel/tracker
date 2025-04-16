// /api/track.js
export default async function handler(req, res) {
  // Get the tracking number from the query parameters
  const { trackingNumber } = req.query;
  
  if (!trackingNumber) {
    return res.status(400).json({ error: 'رقم التتبع مطلوب' });
  }

  // Your API key from environment variable
  const API_KEY = process.env.SHIPPING_API_KEY;
  
  try {
    // Determine if it's NID or CID
    const isNid = trackingNumber.length <= 9;
    const endpoint = isNid ? `nid=${trackingNumber}` : `cid=${trackingNumber}`;
    
    // First fetch basic parcel info
    const parcelUrl = `https://external-api.intigo.tn/secure-api/parcels/parcel?${endpoint}`;
    const parcelResponse = await fetch(parcelUrl, {
      headers: { 
        'Authorization': `{ apiKey: ${API_KEY} }`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!parcelResponse.ok) {
      const errorData = await parcelResponse.json();
      console.error('API error:', errorData);
      throw new Error(`خطأ في API: ${parcelResponse.status}`);
    }
    
    const parcelData = await parcelResponse.json();
    
    // Then fetch parcel history
    const historyUrl = `https://external-api.intigo.tn/secure-api/parcels/${parcelData.nid}/history`;
    const historyResponse = await fetch(historyUrl, {
      headers: { 
        'Authorization': `{ apiKey: ${API_KEY} }`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!historyResponse.ok) {
      const errorData = await historyResponse.json();
      console.error('API error:', errorData);
      throw new Error(`خطأ في API: ${historyResponse.status}`);
    }
    
    const historyData = await historyResponse.json();
    
    // Map Intigo status codes to Arabic messages
    const statusMap = {
      2: 'تم تعيينه لموظف التوصيل',
      6: 'تم التسليم',
      8: 'تم الإلغاء من قبل الإدارة',
      10: 'في طريق التوصيل',
      15: 'تم إرجاعه مؤقتًا',
      16: 'تم إرجاعه نهائيًا',
      17: 'تم إرجاعه إلى البائع',
      20: 'تم نقله إلى المركز الرئيسي',
      21: 'مفقود',
      25: 'تم استلامه في المركز الرئيسي',
      27: 'في الطريق',
      28: 'يتطلب التحقق',
      29: 'سيتم إعادة الإطلاق'
    };
    
    // Transform the data for frontend
    const transformedData = {
      trackingNumber: isNid ? parcelData.nid : parcelData.cid,
      carrier: 'Intigo',
      status: statusMap[parcelData.status] || 'حالة غير معروفة',
      currentLocation: historyData[0]?.centrale || 'غير معروف',
      lastUpdate: historyData[0]?.date || new Date().toISOString(),
      estimatedDelivery: null, // Intigo doesn't provide this
      events: Array.isArray(historyData) ? historyData.map(event => ({
        status: statusMap[event.status] || `الحالة: ${event.status}`,
        location: event.centrale || 'موقع غير معروف',
        timestamp: event.date
      })) : []
    };
    
    // Sort events by date (newest first)
    transformedData.events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return res.status(200).json(transformedData);
  } catch (error) {
    console.error('خطأ في تتبع الشحنة:', error);
    return res.status(500).json({ error: 'فشل في جلب معلومات التتبع' });
  }
}