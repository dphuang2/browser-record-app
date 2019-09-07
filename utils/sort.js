const sortOptions = [
  { label: 'Newest session', value: 'TIMESTAMP_DESC' },
  { label: 'Oldest session', value: 'TIMESTAMP_ASC' },
  { label: 'Most clicks', value: 'CLICKS_DESC' },
  { label: 'Least clicks', value: 'CLICKS_ASC' },
  { label: 'Most page loads', value: 'PAGE_LOADS_DESC' },
  { label: 'Least page loads', value: 'PAGE_LOADS_ASC' },
  { label: 'Longest duration', value: 'DURATION_DESC' },
  { label: 'Shortest duration', value: 'DURATION_ASC' },
  { label: 'Most clicks per second', value: 'CLICKS_PER_SECOND_DESC' },
  { label: 'Least click per second', value: 'CLICKS_PER_SECOND_ASC' },
  { label: 'Country', value: 'COUNTRY' },
];

function createSortCompare(lambdaA, lambdaB, direction) {
  return function compare(a, b) {
    return (lambdaA(a) > lambdaB(b) ? 1 : -1) * direction;
  };
}
const getTimestamp = x => x.timestamp;
const getDuration = x => x.duration;
const getNumClicks = x => x.numClicks;
const getPageLoads = x => x.pageLoads;
const getCountry = x => x.country;
const getClicksPerSecond = x => x.numClicks / x.duration;
const sortOptionsMap = {
  'TIMESTAMP_DESC': createSortCompare(getTimestamp, getTimestamp, -1),
  'TIMESTAMP_ASC': createSortCompare(getTimestamp, getTimestamp, 1),
  'CLICKS_DESC': createSortCompare(getNumClicks, getNumClicks, -1),
  'CLICKS_ASC': createSortCompare(getNumClicks, getNumClicks, 1),
  'PAGE_LOADS_DESC': createSortCompare(getPageLoads, getPageLoads, -1),
  'PAGE_LOADS_ASC': createSortCompare(getPageLoads, getPageLoads, 1),
  'DURATION_DESC': createSortCompare(getDuration, getDuration, -1),
  'DURATION_ASC': createSortCompare(getDuration, getDuration, 1),
  'CLICKS_PER_SECOND_DESC': createSortCompare(getClicksPerSecond, getClicksPerSecond, -1),
  'CLICKS_PER_SECOND_ASC': createSortCompare(getClicksPerSecond, getClicksPerSecond, 1),
  'COUNTRY': createSortCompare(getCountry, getCountry, -1),
}

export { sortOptions, sortOptionsMap };
