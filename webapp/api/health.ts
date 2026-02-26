type VercelRequest = { method?: string };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    message: 'API routes are working. If you see this, /api/places should also work.',
    hasPlacesKey: Boolean(process.env.GOOGLE_PLACES_API_KEY),
  });
}
