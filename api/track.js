// /api/track.js
export default async function handler(req, res) {
    // Get the tracking number from the query parameters
    const { trackingNumber } = req.query;
    
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }
  
    try {
      // In a real implementation, you would call the actual shipping carrier API here
      // For demonstration purposes, we're generating mock data
      
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock tracking data based on the tracking number
      const mockData = generateMockTrackingData(trackingNumber);
      
      // Return the tracking data
      return res.status(200).json(mockData);
    } catch (error) {
      console.error('Error tracking package:', error);
      return res.status(500).json({ error: 'Failed to retrieve tracking information' });
    }
  }
  
  // Function to generate realistic mock tracking data
  function generateMockTrackingData(trackingNumber) {
    // Use the last characters of the tracking number to deterministically generate the status
    const statusSeed = trackingNumber.slice(-1).charCodeAt(0) % 4;
    
    // Use the first part of the tracking number to identify the carrier
    const carrierSeed = trackingNumber.slice(0, 2).toLowerCase();
    
    // Determine carrier
    let carrier;
    if (carrierSeed === '1z') {
      carrier = 'UPS';
    } else if (carrierSeed.startsWith('9')) {
      carrier = 'USPS';
    } else if (carrierSeed === 'fd') {
      carrier = 'FedEx';
    } else {
      carrier = 'Global Shipping Partners';
    }
    
    // Generate a current date
    const now = new Date();
    
    // Generate delivery date (1-5 days from now)
    const deliveryDays = (trackingNumber.charCodeAt(0) % 5) + 1;
    const estimatedDelivery = new Date(now);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);
    
    // Create events array with the most recent first
    const events = [];
    
    // Status types based on the seed
    const statuses = [
      'Delivered', 
      'Out for Delivery',
      'In Transit',
      'Package Processed'
    ];
    
    const status = statuses[statusSeed];
    
    // Generate location based on tracking number
    const cities = [
      'New York, NY',
      'Los Angeles, CA',
      'Chicago, IL',
      'Houston, TX',
      'Phoenix, AZ',
      'Philadelphia, PA',
      'San Antonio, TX',
      'San Diego, CA'
    ];
    
    const currentLocationIndex = Math.abs(trackingNumber.charCodeAt(3) % cities.length);
    const currentLocation = cities[currentLocationIndex];
    
    // Initial package acceptance
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 3);
    
    events.push({
      status: 'Package Processed',
      timestamp: startDate.toISOString(),
      location: 'Shipping Facility'
    });
    
    // Transit event
    if (statusSeed >= 2) {
      const transitDate = new Date(startDate);
      transitDate.setDate(transitDate.getDate() + 1);
      events.push({
        status: 'In Transit',
        timestamp: transitDate.toISOString(),
        location: 'Distribution Center'
      });
    }
    
    // Out for delivery
    if (statusSeed >= 1) {
      const outForDeliveryDate = new Date(now);
      outForDeliveryDate.setHours(outForDeliveryDate.getHours() - 4);
      events.push({
        status: 'Out for Delivery',
        timestamp: outForDeliveryDate.toISOString(),
        location: currentLocation
      });
    }
    
    // Delivered
    if (statusSeed === 0) {
      events.push({
        status: 'Delivered',
        timestamp: now.toISOString(),
        location: currentLocation
      });
    }
    
    // Reverse events so most recent is first
    events.reverse();
    
    // Return the mock tracking data
    return {
      trackingNumber,
      carrier,
      status,
      currentLocation,
      lastUpdate: events[0].timestamp,
      estimatedDelivery: statusSeed === 0 ? null : estimatedDelivery.toISOString(),
      events
    };
  }