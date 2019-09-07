function disambiguateLabel(key, value) {
  switch (key) {
    case 'durationFilter':
      return `Duration is between ${value[0]} and ${value[1]} seconds`;
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
  durationFilterGreater: {
    functional: (duration) => {
      return (session) => {
        if (session.duration > duration)
          return true;
        else
          return false;
      }
    },
    mongodb: (duration) => {
      return {
        $or: [
          { duration: { $exists: false } },
          { duration: { $exists: true, $gt: duration } }
        ]
      }
    }
  },
  durationFilterLess: {
    functional: (duration) => {
      return (session) => {
        if (session.duration < duration)
          return true;
        else
          return false;
      }
    },
    mongodb: (duration) => {
      return {
        $or: [
          { duration: { $exists: false } },
          { duration: { $exists: true, $lt: duration } }
        ]
      }
    }
  },
  durationFilter: {
    functional: (lowerBound, upperBound) => {
      return (session) => {
        if (lowerBound <= session.duration && session.duration <= upperBound)
          return true;
        else
          return false;
      }
    },
    mongodb: (lowerBound, upperBound) => {
      return {
        $or: [
          { duration: { $exists: false } },
          { duration: { $exists: true, $lte: upperBound, $gte: lowerBound } }
        ]
      }
    }
  },
};

export { disambiguateLabel, isEmpty, availableFilters };
