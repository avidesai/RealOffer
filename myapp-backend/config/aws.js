const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadFile = async (file, bucketName) => {
  const params = {
    Bucket: bucketName,
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.originalname}`;
  } catch (error) {
    throw new Error('Error uploading file to S3');
  }
};

module.exports = { s3Client, uploadFile };
