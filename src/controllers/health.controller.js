export const healthController = async (_req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
};
