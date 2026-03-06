export default async function handler(req, res) {
  // POST - Initiate call
  if (req.method === 'POST') {
    try {
      const { phoneNumber, assistantId } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number is required' 
        });
      }

      // Make request to VAPI to initiate call
      const response = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          customer: {
            number: phoneNumber,
          },
          assistantId: assistantId || process.env.VAPI_ASSISTANT_ID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('VAPI API Error:', errorData);
        return res.status(response.status).json({ 
          success: false, 
          error: errorData.message || 'Failed to initiate call' 
        });
      }

      const data = await response.json();

      console.log('VAPI call initiated successfully:', data);

      return res.status(200).json({
        success: true,
        callId: data.id,
        status: data.status,
      });

    } catch (error) {
      console.error('Error initiating call:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      });
    }
  }

  // GET - Check call status
  else if (req.method === 'GET') {
    try {
      const { callId } = req.query;

      if (!callId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Call ID is required' 
        });
      }

      // Fetch call status from VAPI - FIXED: Added parentheses ()
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('VAPI Status Check Error:', errorData);
        return res.status(response.status).json({ 
          success: false, 
          error: 'Failed to fetch call status' 
        });
      }

      const data = await response.json();

      return res.status(200).json({
        success: true,
        status: data.status,
        callId: data.id,
        duration: data.duration,
        endedReason: data.endedReason,
      });

    } catch (error) {
      console.error('Error checking call status:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }

  // Method not allowed
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed` 
    });
  }
}