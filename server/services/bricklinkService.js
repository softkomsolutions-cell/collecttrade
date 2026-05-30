const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const axios = require('axios');

class BrickLinkService {
  constructor() {
    this.oauth = OAuth({
      consumer: {
        key: process.env.BRICKLINK_CONSUMER_KEY,
        secret: process.env.BRICKLINK_CONSUMER_SECRET
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    this.token = {
      key: process.env.BRICKLINK_TOKEN,
      secret: process.env.BRICKLINK_TOKEN_SECRET
    };
  }

  async getPriceGuide(setNum) {
    const url = `https://api.bricklink.com/v3/items/set/${setNum}/price`;

    const requestData = { url, method: 'GET' };
    const authorization = this.oauth.authorize(requestData, this.token);
    const headers = this.oauth.toHeader(authorization);

    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      console.error("BrickLink Error:", error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = new BrickLinkService();