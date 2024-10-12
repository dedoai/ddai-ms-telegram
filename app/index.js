//const fetch = require('node-fetch');
//const redis = require('redis');

exports.handler = async(event) => {
    try {
        return {
		statusCode: 200,
		body: "Hello world"
	};
    } catch (error) {
        return { statusCode: 429, body:"retry in 5s", error: error.toString() };
    }
};
