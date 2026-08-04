import { asyncHandler } from '../utils/asyncHandler.js';
import * as PayoutService from '../services/payout.service.js';

export const adminList = asyncHandler(async (req, res) =>
  res.json(await PayoutService.adminListPayouts(req.query)),
);
export const adminProcess = asyncHandler(async (req, res) =>
  res.json(await PayoutService.adminProcessPayout(req.params.id, req.validated?.body || req.body, req.user.sub)),
);
export const adminExport = asyncHandler(async (req, res) => {
  const csv = await PayoutService.adminExportPayoutsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"');
  res.send(csv);
});
