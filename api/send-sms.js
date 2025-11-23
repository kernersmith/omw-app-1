const twilio = require('twilio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, firstName, profession, trackingLink } = req.body;

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const professionText = profession ? ` (${profession})` : '';
    const message = `Hi! ${firstName}${professionText} is on the way. Track my location: ${trackingLink}`;

    const result = await client.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return res.status(200).json({ 
      success: true, 
      messageId: result.sid 
    });

  } catch (error) {
    console.error('Twilio Error:', error);
    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
};
