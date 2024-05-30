const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3 = require('../config/aws');
const upload = multer({ storage: multer.memoryStorage() });
require('dotenv').config();

router.post('/upload', upload.single('image'), (req, res) => {
  const file = req.file;
  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ACL: 'public-read', // Make the file publicly accessible
  };

  s3.upload(s3Params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error uploading file' });
    }
    res.status(200).json({ imageUrl: data.Location });
  });
});

module.exports = router;
