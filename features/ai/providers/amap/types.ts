export type AmapPhoto = { url?: unknown; title?: unknown };

export type AmapBusiness = {
  rating?: unknown;
  cost?: unknown;
  opentime_today?: unknown;
  opentime_week?: unknown;
  tel?: unknown;
};

export type AmapPoi = {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  typecode?: unknown;
  address?: unknown;
  adname?: unknown;
  location?: unknown;
  tel?: unknown;
  business?: AmapBusiness;
  photos?: AmapPhoto[];
  navi?: { entr_location?: unknown; exit_location?: unknown };
};

export type AmapApiResponse = { status?: unknown; info?: unknown; infocode?: unknown };
export type AmapPoiResponse = AmapApiResponse & { pois?: AmapPoi[] };

export type AmapRoutePath = { distance?: unknown; duration?: unknown; cost?: { duration?: unknown } };
export type AmapRouteResponse = AmapApiResponse & {
  route?: { paths?: AmapRoutePath[] };
};
