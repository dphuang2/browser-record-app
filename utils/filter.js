import {
  DURATION_FILTER_KEY,
  DEVICE_FILTER_KEY,
  NUM_REPLAYS_TO_SHOW_FILTER_KEY,
  TOTAL_CART_PRICE_FILTER_KEY,
  ITEM_COUNT_FILTER_KEY,
  DATE_RANGE_FILTER_KEY,
} from './constants';
import { dollarsToDollars } from './util';

// nullFilter returns all sessions
const nullFilter = [{ sessionId: { $exists: true } }];
const DEFAULT_NUM_REPLAYS_TO_SHOW = 50;
const DEFAULT_DURATION_FILTER_MAX = 60;
const DEFAULT_ITEM_COUNT_MAX = 10;
const DEFAULT_TOTAL_CART_PRICE_MAX = 100.0;

function disambiguateLabel(key, value) {
  switch (key) {
    case DURATION_FILTER_KEY:
      return `Duration is between ${value[0]} and ${value[1]} seconds`;
    case DEVICE_FILTER_KEY:
      return value.map((val) => `Device is ${val}`).join(', ');
    case NUM_REPLAYS_TO_SHOW_FILTER_KEY:
      return `Showing a maximum of ${value} replays`;
    case TOTAL_CART_PRICE_FILTER_KEY:
      return `Total cart price is between ${dollarsToDollars(value[0])} and ${dollarsToDollars(value[1])}`;
    case ITEM_COUNT_FILTER_KEY:
      return `Item count is between ${value[0]} and ${value[1]}`;
    case DATE_RANGE_FILTER_KEY:
      return `Date is between ${value.start.toLocaleDateString()} and ${value.end.toLocaleDateString()}`;
    default:
      return value;
  }
}


const currentDate = new Date();
const availableFilters = {
  [DATE_RANGE_FILTER_KEY]: {
    functional: (bounds) => {
      const start = new Date(bounds.start).getTime();
      const end = new Date(bounds.end).getTime();
      return (session) => {
        if (start <= session.timestamp && session.timestamp <= end)
          return true;
        else
          return false;
      }
    },
    mongodb: (bounds) => {
      const start = new Date(bounds.start);
      const end = new Date(bounds.end);
      // Increment end by 1 day if they are the same date
      if (start.getDate() === end.getDate()) end.setDate(end.getDate() + 1);
      return {
        $or: [
          /**
           * Just in case the document doesn't have the sessionDuration field
           */
          { timestamp: { $exists: false } },
          /**
           * The actual filtering happens here
           */
          { timestamp: { $exists: true, $lte: end.getTime(), $gte: start.getTime() } }
        ]
      }
    },
    defaultValue: {start: currentDate, end: currentDate},
  },
  [ITEM_COUNT_FILTER_KEY]: {
    functional: (bounds) => {
      return (session) => {
        if (bounds[0] <= session.lastItemCount && session.lastItemCount <= bounds[1])
          return true;
        else
          return false;
      }
    },
    mongodb: (bounds) => {
      return {
        $or: [
          /**
           * Just in case the document doesn't have the sessionDuration field
           */
          { lastItemCount: { $exists: false } },
          /**
           * The actual filtering happens here
           */
          { lastItemCount: { $exists: true, $lte: bounds[1], $gte: bounds[0] } }
        ]
      }
    },
    defaultValue: [0, DEFAULT_ITEM_COUNT_MAX],
  },
  [TOTAL_CART_PRICE_FILTER_KEY]: {
    functional: (bounds) => {
      return (session) => {
        bounds[0] *= 100;
        bounds[1] *= 100;
        if (bounds[0] <= session.lastTotalCartPrice && session.lastTotalCartPrice <= bounds[1])
          return true;
        else
          return false;
      }
    },
    mongodb: (bounds) => {
      bounds[0] *= 100;
      bounds[1] *= 100;
      return {
        $or: [
          /**
           * Just in case the document doesn't have the sessionDuration field
           */
          { lastTotalCartPrice: { $exists: false } },
          /**
           * The actual filtering happens here
           */
          { lastTotalCartPrice: { $exists: true, $lte: bounds[1], $gte: bounds[0] } }
        ]
      }
    },
    defaultValue: [0, DEFAULT_TOTAL_CART_PRICE_MAX],
  },
  [DURATION_FILTER_KEY]: {
    functional: (bounds) => {
      return (session) => {
        if (bounds[0] <= session.duration && session.duration <= bounds[1])
          return true;
        else
          return false;
      }
    },
    mongodb: (bounds) => {
      return {
        $or: [
          /**
           * Just in case the document doesn't have the sessionDuration field
           */
          { sessionDuration: { $exists: false } },
          /**
           * The actual filtering happens here
           */
          { sessionDuration: { $exists: true, $lte: bounds[1], $gte: bounds[0] } }
        ]
      }
    },
    defaultValue: [0, DEFAULT_DURATION_FILTER_MAX],
  },
  [DEVICE_FILTER_KEY]: {
    functional: (devices) => {
      return (session) => {
        return devices.indexOf(session.device) > -1;
      }
    },
    mongodb: (devices) => {
      return {
        $or: devices.map((device) => { return { device }; })
      };
    },
    defaultValue: null,
  },
  [NUM_REPLAYS_TO_SHOW_FILTER_KEY]: {
    functional: () => {
      return () => {
        return true;
      }
    },
    mongodb: () => {
      return {
        $and: nullFilter
      };
    },
    defaultValue: DEFAULT_NUM_REPLAYS_TO_SHOW
  }
};

function defaultFilterMap() {
  let clearedFilters = {};
  Object.keys(availableFilters).map((key) => {
    clearedFilters[key] = availableFilters[key].defaultValue;
  });
  return clearedFilters;
}

export { disambiguateLabel, availableFilters, nullFilter, DEFAULT_NUM_REPLAYS_TO_SHOW, defaultFilterMap };
