import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads';
    if (file.fieldname === 'presentation') folder = 'uploads/presentations';
    else if (file.fieldname === 'billet') folder = 'uploads/billets';
    else if (file.fieldname === 'convention_doc') folder = 'uploads/conventions';
    else if (file.fieldname === 'logo') folder = 'uploads/sponsors';
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf','.ppt','.pptx','.doc','.docx','.jpg','.jpeg','.png','.zip','.rar'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype.includes('presentation') || file.mimetype.includes('pdf') || file.mimetype.includes('msword')) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

export default upload;
