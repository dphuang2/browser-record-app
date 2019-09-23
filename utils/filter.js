// nullFilter returns all sessions
const nullFilter = [{ sessionId: { $exists: true } }];
const DEFAULT_NUM_REPLAYS_TO_SHOW = 50;

function disambiguateLabel(key, value) {
  switch (key) {
    case 'durationFilter':
      return `Duration is between ${value[0]} and ${value[1]} seconds`;
    case 'deviceFilter':
      return value.map((val) => `Device is ${val}`).join(', ');
    case 'numReplaysToShow':
      return `Showing a maximum of ${value} replays`;
    default:
      return value;
  }
}


const availableFilters = {
  durationFilter: {
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
    defaultValue: null,
  },
  deviceFilter: {
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
  numReplaysToShow: {
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
