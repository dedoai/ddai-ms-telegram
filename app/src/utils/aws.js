// /src/utils/aws.js
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: 'us-east-1',
});

async function uploadToS3(path, file) {
    const params = {
        Bucket: process.env.BUCKET_S3,
        Key: path,
        Body: file,
    };

    return s3.upload(params).promise();
}

module.exports = { uploadToS3 };
