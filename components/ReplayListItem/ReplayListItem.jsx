import {
  ResourceList, Avatar,
} from '@shopify/polaris';
import PropTypes from 'prop-types';

const FLAG_IMG_FOLDER = '/static/flags/';

function durationStringFromSeconds(seconds) {
  let days = Math.floor(seconds / 86400);
  let hours = Math.floor((seconds % 86400) / 3600);
  let minutes = Math.floor((seconds % 3600) / 60);
  let remainder = Math.floor(seconds % 60);

  if (days > 0) days = (days === 1) ? '1 day' : `${days} days`;
  else days = '';
  if (hours > 0) hours = (hours === 1) ? '1 hour' : `${hours} hours`;
  else hours = '';
  if (minutes > 0) minutes = (minutes === 1) ? '1 minute' : `${minutes} minutes`;
  else minutes = '';
  if (remainder > 0) remainder = (remainder === 1) ? '1 second' : `${remainder} seconds`;
  else remainder = '';

  // Decrease granularity for larger denominations
  const times = [days, hours, minutes, remainder];
  let numTimes = 0;
  const timesToUse = [];
  for (let i = 0; i < times.length; i += 1) {
    if (times[i]) {
      timesToUse.push(times[i]);
      numTimes += 1;
      if (numTimes === 2) break;
    }
  }
  if (numTimes === 0) return '1 second';
  if (numTimes === 1) return timesToUse[0];
  return `${timesToUse[0]} ${timesToUse[1]}`;
}

function centsToDollars(cents) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const ReplayListItem = function mrl(props) {
  const {
    os,
    browser,
    region,
    country,
    locationAvailable,
    id,
    timestamp,
    duration,
    numClicks,
    handleItemClick,
    pageLoads,
    lastItemCount,
    lastTotalCartPrice,
  } = props;

  // Parse time
  let locationString = 'Location Not Available';
  let media;
  if (locationAvailable) {
    if (country) {
      locationString = `${country}`;
      if (region)
        locationString = `${region}, ${country}`;
    }
    media = <Avatar customer size="medium" name={locationString} source={`${FLAG_IMG_FOLDER}${country.toLowerCase()}.svg`} />;
  } else {
    media = <Avatar customer size="medium" name={locationString} />;
  }

  // Generate date string
  const date = new Date(timestamp);
  const dateString = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });

  // Generate duration string
  const durationInSeconds = parseInt(duration, 10);
  const durationString = durationStringFromSeconds(durationInSeconds);

  return (
    <ResourceList.Item
      id={id}
      media={media}
      onClick={handleItemClick}
    >
      <div className="ReplayListItem">
        <div className="ReplayListItem__Hero">
          <div className="ReplayListItem__Title">
            {locationString}
          </div>
          <div className="ReplayListItem__Timestamp">
            {dateString}
          </div>
          <div className="ReplayListItem__Duration">
            {durationString}
          </div>
        </div>
        <div className="ReplayListItem__UserAgent">
          <div className="ReplayListItem__Browser">
            {browser}
          </div>
          <div className="ReplayListItem__OS">
            {os}
          </div>
        </div>
        <div className="ReplayListItem__Interactions">
          <div className="ReplayListItem__Clicks">
            {numClicks}
            {' '}
            {numClicks === 1 ? 'click' : 'clicks'}
          </div>
          <div className="ReplayListItem__PageLoads">
            {pageLoads}
            {' '}
            {pageLoads === 1 ? 'page load' : 'page loads'}
          </div>
        </div>
        <div className="ReplayListItem__Cart">
          <div className="ReplayListItem__LastTotalCartPrice">
            {centsToDollars(lastTotalCartPrice)}
          </div>
          <div className="ReplayListItem__MaxTotalCartPrice">
            {lastItemCount}
            {' '}
            {lastItemCount === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>
      <style jsx>
        {`
.ReplayListItem {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
  "hero"
  "useragent"
  "cart"
  "interactions";
}

.ReplayListItem__Hero {
  grid-area: hero;
}

.ReplayListItem__Title {
  font-weight: 600;
  display: inline;
  margin-right: 5px;
}

.ReplayListItem__Timestamp {
  color: #505050;
  font-style: italic;
}

.ReplayListItem__UserAgent {
  grid-area: useragent;
}

.ReplayListItem__Cart {
  grid-area: cart;
}

.ReplayListItem__Interactions {
  grid-area: interactions;
}

@media(min-width: 800px) {
  .ReplayListItem {
    grid-template-columns: repeat(4, 1fr);
    grid-template-areas: "hero useragent interactions cart";
  }

  .ReplayListItem__Timestamp {
    display: inline;
  }

  .ReplayListItem__UserAgent {
    text-align: right;
  }

  .ReplayListItem__Interactions {
    text-align: right;
  }

  .ReplayListItem__Cart {
    text-align: right;
  }
}
        `}
      </style>
    </ResourceList.Item>
  );
};

ReplayListItem.propTypes = {
  os: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  country: PropTypes.string.isRequired,
  browser: PropTypes.string.isRequired,
  region: PropTypes.string.isRequired,
  locationAvailable: PropTypes.bool.isRequired,
  timestamp: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  numClicks: PropTypes.number.isRequired,
  pageLoads: PropTypes.number.isRequired,
  handleItemClick: PropTypes.func.isRequired,
  lastItemCount: PropTypes.number.isRequired,
  lastTotalCartPrice: PropTypes.number.isRequired,
};

export default ReplayListItem;
