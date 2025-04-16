export default async function handler(req, res) {
  const { trackingNumber } = req.query;
  
  if (!trackingNumber) {
    return res.status(400).json({ error: 'الرجاء إدخال رقم التتبع' });
  }

  const API_KEY = process.env.SHIPPING_API_KEY;
  
  try {
    const isNid = trackingNumber.length <= 9;
    const endpoint = isNid ? `nid=${trackingNumber}` : `cid=${trackingNumber}`;
    
    // Fetch parcel info from Intigo
    const parcelRes = await fetch(`https://external-api.intigo.tn/secure-api/parcels/parcel?${endpoint}`, {
      headers: { 
        'Authorization': `{ apiKey: ${API_KEY} }`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!parcelRes.ok) throw new Error('فشل الاتصال بخدمة التتبع');
    
    const parcelData = await parcelRes.json();
    
    // Fetch history
    const historyRes = await fetch(`https://external-api.intigo.tn/secure-api/parcels/${parcelData.nid}/history`, {
      headers: { 
        'Authorization': `{ apiKey: ${API_KEY} }`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!historyRes.ok) throw new Error('فشل جلب سجل الشحنة');
    
    const historyData = await historyRes.json();
    
    // Transform data
    const statusMap = {
      2: 'تم تعيينه لموظف التوصيل',
      6: 'تم التسليم',
      10: 'في طريق التوصيل',
      // ... (add all other status codes)
    };
    
    const transformedData = {
      status: statusMap[parcelData.status] || 'جاري المعالجة',
      currentLocation: historyData[0]?.centrale || 'غير معروف',
      lastUpdate: historyData[0]?.date || new Date().toISOString(),
      carrier: 'Intigo',
      events: historyData.map(event => ({
        status: statusMap[event.status] || event.status,
        location: event.centrale,
        timestamp: event.date
      }))
    };
    
    res.status(200).json(transformedData);
    
  } catch (error) {
    res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}