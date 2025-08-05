// routes/upload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3Client } = require('../config/aws');

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  })
});

router.post('/', upload.array('propertyImages', 100), (req, res) => {
  const propertyImages = req.files.map(file => file.location);
  res.json({ message: 'Files uploaded successfully', files: propertyImages });
});

module.exports = router;
