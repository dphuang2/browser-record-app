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
};

export default availableFilters;
