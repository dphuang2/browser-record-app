function disambiguateLabel(key, value) {
  switch (key) {
    case 'durationFilter':
      return `Duration is between ${value[0]} and ${value[1]} seconds`;
    case 'deviceFilter':
      return value.map((val) => `Device is ${val}`).join(', ');
    default:
      return value;
  }
}

function isEmpty(value) {
  if (Array.isArray(value)) {
    return value.length === 0;
  } else {
    return value === '' || value == null;
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
    }
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
  }
};

export { disambiguateLabel, isEmpty, availableFilters };
