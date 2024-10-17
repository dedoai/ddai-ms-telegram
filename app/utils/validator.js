const fs = require('fs');
const axios = require('axios');
const path = require('path');
// const sharp = require('sharp');

const apiKey = process.env.ANTHROPIC_API_KEY;
const apiUrl = 'https://api.anthropic.com/v1/messages';

async function validate (filePath, description, c4ddescr) {
    try {
//      const image = Buffer.from(event.body, 'binary');

    // Leggi il file dal filesystem e mettilo in un buffer
    const absolutePath = path.resolve(filePath);
    const fileBuffer = fs.readFileSync(absolutePath);

      const question = "the images must respect this rule:("+ c4ddescr +") I need you to answer me with a json with 'status' -> that is ('SUCCESS' or 'ERROR', in case of error code I want a field description with the description of why it does not respect the request), if it is \"SUCCESS\" I expect a \"score\" -> that is from 0 to 1 in float format, like 1.00 if it follows the request, 0.78 if it does not fully respect it etc, I only want the json minified as response and nothing else, in English, I need to be able to copy it or unmarshal it from other tools. User input as metadata is: \"description\"";
      console.log("Validator question ", question)
//      const compressedImage = await sharp(image)
//        .resize(512, 512)
//        .toBuffer();

      const imageBase64 = fileBuffer.toString('base64');
      const mediaType = 'image/jpeg';

      const response = await axios.post(
        apiUrl,
        {
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: question,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      const jsonResponse = JSON.parse(response.data.content[0].text);

      return jsonResponse;
    } catch (error) {
      console.error(error);
      return {
        status: "ERROR",
        description: "Service unavailable at now, retry later"
      };
    }
};

module.exports = { validate }