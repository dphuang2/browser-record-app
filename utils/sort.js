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
  { label: 'Greatest total price of cart', value: 'TOTAL_CART_PRICE_DESC' },
  { label: 'Least total price of cart', value: 'TOTAL_CART_PRICE_ASC' },
  { label: 'Most items in cart', value: 'ITEM_COUNT_DESC' },
  { label: 'Least items in cart', value: 'ITEM_COUNT_ASC' },
  { label: 'Country', value: 'COUNTRY' },
];

function createSortCompare(getter, direction) {
  return function compare(a, b) {
    return (getter(a) > getter(b) ? 1 : -1) * direction;
  };
}
const getTimestamp = x => x.timestamp;
const getDuration = x => x.duration;
const getNumClicks = x => x.numClicks;
const getPageLoads = x => x.pageLoads;
const getCountry = x => x.country;
const getTotalCartPrice = x => x.lastTotalCartPrice;
const getItemCount = x => x.lastItemCount;
const getClicksPerSecond = x => x.numClicks / x.duration;
const sortOptionsMap = {
  'TIMESTAMP_DESC': createSortCompare(getTimestamp, -1),
  'TIMESTAMP_ASC': createSortCompare(getTimestamp, 1),
  'CLICKS_DESC': createSortCompare(getNumClicks, -1),
  'CLICKS_ASC': createSortCompare(getNumClicks, 1),
  'PAGE_LOADS_DESC': createSortCompare(getPageLoads, -1),
  'PAGE_LOADS_ASC': createSortCompare(getPageLoads, 1),
  'DURATION_DESC': createSortCompare(getDuration, -1),
  'DURATION_ASC': createSortCompare(getDuration, 1),
  'CLICKS_PER_SECOND_DESC': createSortCompare(getClicksPerSecond, -1),
  'CLICKS_PER_SECOND_ASC': createSortCompare(getClicksPerSecond, 1),
  'TOTAL_CART_PRICE_DESC': createSortCompare(getTotalCartPrice, -1),
  'TOTAL_CART_PRICE_ASC': createSortCompare(getTotalCartPrice, 1),
  'ITEM_COUNT_DESC': createSortCompare(getItemCount, -1),
  'ITEM_COUNT_ASC': createSortCompare(getItemCount, 1),
  'COUNTRY': createSortCompare(getCountry, -1),
}

export { sortOptions, sortOptionsMap };
