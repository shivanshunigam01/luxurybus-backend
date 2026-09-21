import multer from 'multer';

const allowedExt = /\.(jpe?g|png|webp|gif|pdf|heic|heif)$/i;
const allowedMime =
  /^(image\/(jpeg|jpg|pjpeg|png|webp|gif|heic|heif)|application\/pdf|application\/x-pdf|application\/octet-stream)$/i;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname || '';
    const mimeOk = allowedMime.test(file.mimetype || '');
    const extOk = allowedExt.test(name);
    if (extOk || (mimeOk && file.mimetype !== 'application/octet-stream')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only images (JPG, PNG, WEBP) and PDF files are allowed'));
  },
});
