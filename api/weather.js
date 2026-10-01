// Fixed Open-Meteo endpoint with bounded caching; never accepts a target URL.
const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 64;

function createHandler(fetchWeather = fetch, now = Date.now) {
  const cache = new Map();
  const pending = new Map();
  return async function weather(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({error:'GET required'});
    }
    const query = req.query || {};
    const coordinate = (value, min, max) => {
      if (typeof value !== 'string' || !value.trim()) return null;
      const n = Number(value);
      return Number.isFinite(n) && n >= min && n <= max ? n : null;
    };
    const latitude = coordinate(query.latitude, -90, 90);
    const longitude = coordinate(query.longitude, -180, 180);
    if (latitude === null || longitude === null) {
      return res.status(400).json({error:'Valid latitude and longitude required'});
    }
    const key = `${latitude},${longitude}`;
    try {
      let item = cache.get(key);
      if (!item || item.expires <= now()) {
        if (!pending.has(key)) {
          if (pending.size >= 8) return res.status(503).json({error:'Weather busy'});
          const request = (async () => {
            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.search = new URLSearchParams({latitude, longitude, timezone:'auto',
              forecast_days:'1',daily:'et0_fao_evapotranspiration,precipitation_sum',precipitation_unit:'mm'});
            const response = await fetchWeather(url, {signal:AbortSignal.timeout(8000)});
            if (!response.ok) throw new Error('Weather provider unavailable');
            const data = await response.json();
            const offset = data.utc_offset_seconds;
            if (!Number.isFinite(offset) || Math.abs(offset)>50400) throw new Error('Weather timezone');
            const localNow = now()+offset*1000;
            const today = new Date(localNow).toISOString().slice(0,10);
            const index = data.daily?.time?.indexOf(today) ?? -1;
            const et0 = data.daily?.et0_fao_evapotranspiration?.[index];
            const rain = data.daily?.precipitation_sum?.[index];
            if (index < 0 || data.daily_units?.et0_fao_evapotranspiration !== 'mm' ||
                data.daily_units?.precipitation_sum !== 'mm' ||
                typeof et0 !== 'number' || !Number.isFinite(et0) || et0 < 0 || et0 > 50 ||
                typeof rain !== 'number' || !Number.isFinite(rain) || rain < 0 || rain > 3000) {
              throw new Error('Invalid weather');
            }
            const untilMidnight = 86400000 - ((localNow % 86400000 + 86400000) % 86400000);
            const item = {data, expires:now()+Math.min(TTL_MS,untilMidnight)};
            if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
            cache.set(key,item);
            return item;
          })();
          pending.set(key,request);
          request.finally(()=>pending.delete(key)).catch(()=>{});
        }
        item = await pending.get(key);
      }
      const seconds = Math.max(0,Math.floor((item.expires-now())/1000));
      res.setHeader('Cache-Control',`public, max-age=0, s-maxage=${seconds}`);
      return res.status(200).json(item.data);
    } catch (_) {
      return res.status(503).json({error:'Weather temporarily unavailable'});
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
