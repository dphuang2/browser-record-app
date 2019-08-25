import {
  ResourceList, Avatar,
} from '@shopify/polaris';
import PropTypes from 'prop-types';

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
  } = props;

  // Parse time
  let locationString = 'Location Not Available';
  let media = <Avatar customer size="medium" name={locationString} source={`/assets/flags/${country.toLowerCase()}.svg`} />;
  if (locationAvailable) {
    locationString = `${region}, ${country}`;
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
          {browser}
          {' on '}
          {os}
        </div>
        <div className="ReplayListItem__Clicks">
          {numClicks}
          {' '}
          {numClicks === 1 ? 'click' : 'clicks'}
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
  "clicks";
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
  display: inline;
}

.ReplayListItem__UserAgent {
  grid-area: useragent;
}

.ReplayListItem__Clicks {
  grid-area: clicks;
}

@media(min-width: 800px) {
  .ReplayListItem {
    grid-template-columns: repeat(4, 1fr);
    grid-template-areas: "hero hero useragent clicks";
  }

  .ReplayListItem__UserAgent {
    text-align: right;
  }

  .ReplayListItem__Clicks {
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
  handleItemClick: PropTypes.func.isRequired,
};

export default ReplayListItem;
