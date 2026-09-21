import multer from 'multer';

const allowedMime = /^(image\/(jpeg|jpg|pjpeg|png|webp|gif)|application\/pdf)$/i;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMime.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only images (JPG, PNG, WEBP) and PDF files are allowed'));
  },
});
