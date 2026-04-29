import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  const body = await handleUpload({
    body: req.body,
    request: req,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
    }),
    onUploadCompleted: async () => {},
  });
  return res.status(200).json(body);
}
