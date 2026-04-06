import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { serverConfig } from './config';

export type UploadKind = 'books' | 'documents';

const ASSET_PREFIX = '/api/assets/';

type UploadRule = {
  canonicalExtension: string;
  extensions: string[];
  matchesHeader: (header: Buffer) => boolean;
};

type KindSettings = {
  maxSize: number;
  rules: Record<string, UploadRule>;
};

const startsWithBytes = (header: Buffer, bytes: number[]) => bytes.every((value, index) => header[index] === value);
const startsWithAscii = (header: Buffer, text: string) => header.subarray(0, text.length).toString('ascii') === text;

const isJpeg = (header: Buffer) => startsWithBytes(header, [0xff, 0xd8, 0xff]);
const isPng = (header: Buffer) => startsWithBytes(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isGif = (header: Buffer) => startsWithAscii(header, 'GIF87a') || startsWithAscii(header, 'GIF89a');
const isWebp = (header: Buffer) => startsWithAscii(header, 'RIFF') && header.subarray(8, 12).toString('ascii') === 'WEBP';
const isPdf = (header: Buffer) => startsWithAscii(header, '%PDF-');
const isZip = (header: Buffer) => startsWithBytes(header, [0x50, 0x4b, 0x03, 0x04]);
const isOleDocument = (header: Buffer) => startsWithBytes(header, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isRtf = (header: Buffer) => startsWithAscii(header, '{\\rtf');
const isPlainText = (header: Buffer) => {
  if (header.length === 0) {
    return false;
  }

  for (const value of header) {
    if (value === 0) {
      return false;
    }

    const isWhitespace = value === 9 || value === 10 || value === 13;
    const isPrintableAscii = value >= 32 && value <= 126;
    if (!isWhitespace && !isPrintableAscii) {
      return false;
    }
  }

  return true;
};

const coverRules: Record<string, UploadRule> = {
  'image/jpeg': {
    canonicalExtension: '.jpg',
    extensions: ['.jpg', '.jpeg'],
    matchesHeader: isJpeg,
  },
  'image/png': {
    canonicalExtension: '.png',
    extensions: ['.png'],
    matchesHeader: isPng,
  },
  'image/webp': {
    canonicalExtension: '.webp',
    extensions: ['.webp'],
    matchesHeader: isWebp,
  },
  'image/gif': {
    canonicalExtension: '.gif',
    extensions: ['.gif'],
    matchesHeader: isGif,
  },
};

const documentRules: Record<string, UploadRule> = {
  'application/pdf': {
    canonicalExtension: '.pdf',
    extensions: ['.pdf'],
    matchesHeader: isPdf,
  },
  'application/msword': {
    canonicalExtension: '.doc',
    extensions: ['.doc'],
    matchesHeader: isOleDocument,
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    canonicalExtension: '.docx',
    extensions: ['.docx'],
    matchesHeader: isZip,
  },
  'application/vnd.ms-excel': {
    canonicalExtension: '.xls',
    extensions: ['.xls'],
    matchesHeader: isOleDocument,
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    canonicalExtension: '.xlsx',
    extensions: ['.xlsx'],
    matchesHeader: isZip,
  },
  'application/vnd.ms-powerpoint': {
    canonicalExtension: '.ppt',
    extensions: ['.ppt'],
    matchesHeader: isOleDocument,
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    canonicalExtension: '.pptx',
    extensions: ['.pptx'],
    matchesHeader: isZip,
  },
  'text/plain': {
    canonicalExtension: '.txt',
    extensions: ['.txt'],
    matchesHeader: isPlainText,
  },
  'application/rtf': {
    canonicalExtension: '.rtf',
    extensions: ['.rtf'],
    matchesHeader: isRtf,
  },
};

const sanitizeBaseName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const getKindSettings = (kind: UploadKind): KindSettings =>
  kind === 'books'
    ? {
        maxSize: serverConfig.bookCoverMaxSizeBytes,
        rules: coverRules,
      }
    : {
        maxSize: serverConfig.documentMaxSizeBytes,
        rules: documentRules,
      };

const getRuleForMime = (kind: UploadKind, mimeType: string) => getKindSettings(kind).rules[mimeType] ?? null;

const readFileHeader = async (filePath: string, bytesToRead = 512) => {
  const handle = await fs.promises.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(bytesToRead);
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

export class AssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetValidationError';
  }
}

export const getAssetsRoot = () => path.resolve(process.cwd(), serverConfig.uploadRootDir);

const getPublicAssetPath = (relativeFilePath: string) =>
  `${ASSET_PREFIX}${relativeFilePath.replace(/\\/g, '/').replace(/^\/+/, '')}`;

export const ensureAssetDirectories = () => {
  fs.mkdirSync(path.join(getAssetsRoot(), 'books'), { recursive: true });
  fs.mkdirSync(path.join(getAssetsRoot(), 'documents'), { recursive: true });
};

export const createUploadMiddleware = (kind: UploadKind, fieldName: string) => {
  const settings = getKindSettings(kind);

  const storage = multer.diskStorage({
    destination(_request, _file, callback) {
      const now = new Date();
      const relativeDirectory = path.join(kind, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
      const absoluteDirectory = path.join(getAssetsRoot(), relativeDirectory);
      fs.mkdirSync(absoluteDirectory, { recursive: true });
      callback(null, absoluteDirectory);
    },
    filename(_request, file, callback) {
      const rule = getRuleForMime(kind, file.mimetype);
      if (!rule) {
        callback(new AssetValidationError('Tipo de arquivo não permitido.'), '');
        return;
      }

      const originalExtension = path.extname(file.originalname || '').toLowerCase();
      const baseName = sanitizeBaseName(path.basename(file.originalname, originalExtension)) || kind;
      callback(null, `${Date.now()}-${randomBytes(5).toString('hex')}-${baseName}${rule.canonicalExtension}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: settings.maxSize, files: 1 },
    fileFilter(_request, file, callback) {
      const rule = getRuleForMime(kind, file.mimetype);
      if (!rule) {
        callback(new AssetValidationError('Tipo de arquivo não permitido.'));
        return;
      }

      const originalExtension = path.extname(file.originalname || '').toLowerCase();
      if (originalExtension && !rule.extensions.includes(originalExtension)) {
        callback(new AssetValidationError('A extensão enviada não corresponde ao tipo do arquivo.'));
        return;
      }

      callback(null, true);
    },
  }).single(fieldName);
};

export const assertUploadedAssetIsSafe = async (kind: UploadKind, file: Express.Multer.File) => {
  const rule = getRuleForMime(kind, file.mimetype);
  if (!rule) {
    await fs.promises.rm(file.path, { force: true });
    throw new AssetValidationError('Tipo de arquivo não permitido.');
  }

  const header = await readFileHeader(file.path);
  if (!rule.matchesHeader(header)) {
    await fs.promises.rm(file.path, { force: true });
    throw new AssetValidationError('O conteúdo do arquivo não corresponde ao tipo informado.');
  }
};

export const buildUploadedAssetPayload = (file: Express.Multer.File) => {
  const relativePath = path.relative(getAssetsRoot(), file.path);
  return {
    arquivoNome: file.originalname,
    arquivoMime: file.mimetype,
    arquivoTamanho: file.size,
    caminhoPublico: getPublicAssetPath(relativePath),
  };
};

export const isManagedAsset = (value: string) => value.startsWith(ASSET_PREFIX);

export const resolveManagedAssetPath = (value: string) => {
  const relativePath = value.replace(ASSET_PREFIX, '').replace(/\//g, path.sep);
  const absolutePath = path.resolve(getAssetsRoot(), relativePath);
  if (!absolutePath.startsWith(getAssetsRoot())) {
    throw new Error('Caminho de arquivo fora da pasta de uploads.');
  }

  return absolutePath;
};

export const deleteManagedAsset = async (value: string) => {
  if (!isManagedAsset(value)) {
    return;
  }

  const absolutePath = resolveManagedAssetPath(value);
  await fs.promises.rm(absolutePath, { force: true });
};
