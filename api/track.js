export default async function handler(req, res) {
  const { trackingNumber } = req.query;
  
  if (!trackingNumber) {
      return res.status(400).json({ error: 'رقم التتبع مطلوب' });
  }

  const API_KEY = process.env.SHIPPING_API_KEY;
  
  try {
      // Determine if it's NID or CID
      const isNid = trackingNumber.length <= 9;
      const endpoint = isNid ? `nid=${trackingNumber}` : `cid=${trackingNumber}`;
      
      // 1. Fetch parcel info
      const parcelRes = await fetch(`https://external-api.intigo.tn/secure-api/parcels/parcel?${endpoint}`, {
          headers: { 
              'Authorization': `{ apiKey: ${API_KEY} }`,
              'Content-Type': 'application/json'
          }
      });
      
      if (!parcelRes.ok) {
          throw new Error('فشل في جلب بيانات الشحنة');
      }
      
      const parcelData = await parcelRes.json();
      
      // 2. Fetch history
      const historyRes = await fetch(`https://external-api.intigo.tn/secure-api/parcels/${parcelData.nid}/history`, {
          headers: { 
              'Authorization': `{ apiKey: ${API_KEY} }`,
              'Content-Type': 'application/json'
          }
      });
      
      if (!historyRes.ok) {
          throw new Error('فشل في جلب سجل الشحنة');
      }
      
      const historyData = await historyRes.json();
      
      // Transform data
      const statusMap = {
          2: 'تم تعيينه لموظف التوصيل',
          6: 'تم التسليم',
          10: 'في طريق التوصيل',
          // Add all other status codes
      };
      
      const transformedData = {
          status: statusMap[parcelData.status] || parcelData.status,
          currentLocation: historyData[0]?.centrale || 'غير معروف',
          lastUpdate: historyData[0]?.date || new Date().toISOString(),
          events: historyData.map(event => ({
              status: statusMap[event.status] || event.status,
              location: event.centrale,
              timestamp: event.date
          }))
      };
      
      res.status(200).json(transformedData);
      
  } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: error.message || 'خطأ في الخادم' });
  }
}