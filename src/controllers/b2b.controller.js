import { asyncHandler } from '../utils/asyncHandler.js';
import * as B2B from '../services/b2b.service.js';

export const dashboard = asyncHandler(async (req, res) => res.json(await B2B.getDashboard(req.user.sub)));
export const company = asyncHandler(async (req, res) => res.json(await B2B.getCompany(req.user.sub)));
export const employees = asyncHandler(async (req, res) => res.json(await B2B.listEmployees(req.user.sub)));
export const inviteEmployee = asyncHandler(async (req, res) =>
  res.status(201).json(await B2B.inviteEmployee(req.user.sub, req.validated?.body || req.body)),
);
export const updateEmployee = asyncHandler(async (req, res) =>
  res.json(await B2B.updateEmployee(req.user.sub, req.params.id, req.validated?.body || req.body)),
);
export const bookings = asyncHandler(async (req, res) => res.json(await B2B.listBookings(req.user.sub, req.query)));
export const acceptQuote = asyncHandler(async (req, res) =>
  res.json(await B2B.acceptQuoteForCompany(req.user.sub, req.params.id, req.validated?.body || req.body)),
);
export const favourites = asyncHandler(async (req, res) => res.json(await B2B.listFavourites(req.user.sub)));
export const addFavourite = asyncHandler(async (req, res) =>
  res.status(201).json(await B2B.addFavourite(req.user.sub, req.validated?.body || req.body)),
);
export const removeFavourite = asyncHandler(async (req, res) =>
  res.json(await B2B.removeFavourite(req.user.sub, req.params.id)),
);
export const wallet = asyncHandler(async (req, res) => res.json(await B2B.getWallet(req.user.sub)));
export const contracts = asyncHandler(async (req, res) => res.json(await B2B.listContracts(req.user.sub)));
export const invoices = asyncHandler(async (req, res) => res.json(await B2B.listInvoices(req.user.sub)));
export const invoice = asyncHandler(async (req, res) => res.json(await B2B.getInvoice(req.user.sub, req.params.id)));

/* Admin */
export const adminCompanies = asyncHandler(async (req, res) => res.json(await B2B.adminListCompanies(req.query)));
export const adminCompany = asyncHandler(async (req, res) => res.json(await B2B.adminGetCompany(req.params.id)));
export const adminCompanyStatus = asyncHandler(async (req, res) =>
  res.json(await B2B.adminUpdateCompanyStatus(req.params.id, req.validated?.body || req.body, req.user.sub)),
);
export const adminCreateContract = asyncHandler(async (req, res) =>
  res.status(201).json(await B2B.adminUpsertContract(req.params.companyId, req.validated?.body || req.body)),
);
export const adminUpdateContract = asyncHandler(async (req, res) =>
  res.json(await B2B.adminUpsertContract(req.params.companyId, req.validated?.body || req.body, req.params.id)),
);
export const adminDeleteContract = asyncHandler(async (req, res) =>
  res.json(await B2B.adminDeleteContract(req.params.id)),
);
export const adminInvoices = asyncHandler(async (req, res) => res.json(await B2B.adminListInvoices(req.query)));
export const adminMarkInvoicePaid = asyncHandler(async (req, res) =>
  res.json(await B2B.adminMarkInvoicePaid(req.params.id)),
);
export const adminGstSummary = asyncHandler(async (req, res) => res.json(await B2B.adminGstSummary(req.query)));
export const adminReport = asyncHandler(async (req, res) => res.json(await B2B.adminCompanyReport(req.query)));
