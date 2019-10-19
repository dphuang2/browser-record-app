import {
  DURATION_FILTER_KEY,
  DEVICE_FILTER_KEY,
  NUM_CUSTOMERS_TO_SHOW_FILTER_KEY,
  TOTAL_CART_PRICE_FILTER_KEY,
  ITEM_COUNT_FILTER_KEY,
  DATE_RANGE_FILTER_KEY,
} from './constants';
import { dollarsToDollars } from './util';

// nullFilter returns all sessions
const nullFilter = [{ id: { $exists: true } }];
const DEFAULT_NUM_CUSTOMERS_TO_SHOW = 20;
const DEFAULT_DURATION_FILTER_MAX = 60;
const DEFAULT_ITEM_COUNT_MAX = 10;
const DEFAULT_TOTAL_CART_PRICE_MAX = 10000.0;

function disambiguateLabel(key, value) {
  switch (key) {
    case DURATION_FILTER_KEY:
      return `Duration is between ${value[0]} and ${value[1]} seconds`;
    case DEVICE_FILTER_KEY:
      return value.map((val) => `Device is ${val}`).join(', ');
    case NUM_CUSTOMERS_TO_SHOW_FILTER_KEY:
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
    mongodb: (bounds) => {
      const start = new Date(bounds.start);
      const end = new Date(bounds.end);
      // Increment end by 1 day
      end.setDate(end.getDate() + 1);
      return {
        $or: [
          /**
           * Just in case the document doesn't have the sessionDuration field
           */
          { startTime: { $exists: false } },
          /**
           * The actual filtering happens here
           */
          { startTime: { $exists: true, $lte: end.getTime(), $gte: start.getTime() } }
        ]
      }
    },
    defaultValue: {start: currentDate, end: currentDate},
  },
  [ITEM_COUNT_FILTER_KEY]: {
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
    mongodb: (devices) => {
      return {
        $or: devices.map((device) => { return { device }; })
      };
    },
    defaultValue: null,
  },
  [NUM_CUSTOMERS_TO_SHOW_FILTER_KEY]: {
    mongodb: () => {
      return {
        $and: nullFilter
      };
    },
    defaultValue: DEFAULT_NUM_CUSTOMERS_TO_SHOW
  }
};

function defaultFilterMap() {
  let clearedFilters = {};
  Object.keys(availableFilters).map((key) => {
    clearedFilters[key] = availableFilters[key].defaultValue;
  });
  return clearedFilters;
}

export { disambiguateLabel, availableFilters, nullFilter, DEFAULT_NUM_CUSTOMERS_TO_SHOW, defaultFilterMap };
