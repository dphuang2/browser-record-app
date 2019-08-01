import {
  ResourceList,
  Page,
  Card,
} from '@shopify/polaris';
import axios from 'axios';
import PropTypes from 'prop-types';
import ReplayListItem from '../components/ReplayListItem';
import Player from '../components/Player';

const sortOptions = [
  { label: 'Newest session', value: 'TIMESTAMP_DESC' },
  { label: 'Oldest session', value: 'TIMESTAMP_ASC' },
  { label: 'Most clicks', value: 'CLICKS_DESC' },
  { label: 'Least clicks', value: 'CLICKS_ASC' },
  { label: 'Longest duration', value: 'DURATION_DESC' },
  { label: 'Shortest duration', value: 'DURATION_ASC' },
  { label: 'Most clicks per second', value: 'CLICKS_PER_SECOND_DESC' },
  { label: 'Least click per second', value: 'CLICKS_PER_SECOND_ASC' },
  { label: 'Country', value: 'COUNTRY' },
];

function createSortCompare(lambdaA, lambdaB, direction) {
  return function compare(a, b) {
    if (lambdaA(a) < lambdaB(b)) return -1 * direction;
    if (lambdaA(a) > lambdaB(b)) return 1 * direction;
    return 0;
  };
}
const getTimestamp = x => x.timestamp;
const getDuration = x => x.duration;
const getNumClicks = x => x.numClicks;
const getCountry = x => x.country;
const getClicksPerSecond = x => x.numClicks / x.duration;
const timestampDesc = createSortCompare(getTimestamp, getTimestamp, -1);
const timestampAsc = createSortCompare(getTimestamp, getTimestamp, 1);
const numClicksDesc = createSortCompare(getNumClicks, getNumClicks, -1);
const numClicksAsc = createSortCompare(getNumClicks, getNumClicks, 1);
const durationDesc = createSortCompare(getDuration, getDuration, -1);
const durationAsc = createSortCompare(getDuration, getDuration, 1);
const countrySort = createSortCompare(getCountry, getCountry, -1);
const clicksPerSecondDesc = createSortCompare(getClicksPerSecond, getClicksPerSecond, -1);
const clicksPerSecondAsc = createSortCompare(getClicksPerSecond, getClicksPerSecond, 1);

class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      currentReplay: undefined,
      replays: [],
      sortValue: 'TIMESTAMP_DESC',
    };
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  async componentDidMount() {
    this.setState({
      loading: true,
    });
    const { shopOrigin } = this.props;
    const response = await axios.get(`/api/sessions/shop/${shopOrigin}`);
    const replays = response.data;
    const replayMap = {};
    for (let i = 0; i < replays.length; i += 1) { replayMap[replays[i].id] = replays[i]; }
    this.setState({
      loading: false,
      replays,
      replayMap,
    });
  }

  handleSortChange(sortValue) {
    this.setState((state) => {
      let replays;
      switch (sortValue) {
        case 'TIMESTAMP_DESC':
          replays = state.replays.sort(timestampDesc);
          break;
        case 'TIMESTAMP_ASC':
          replays = state.replays.sort(timestampAsc);
          break;
        case 'CLICKS_DESC':
          replays = state.replays.sort(numClicksDesc);
          break;
        case 'CLICKS_ASC':
          replays = state.replays.sort(numClicksAsc);
          break;
        case 'DURATION_DESC':
          replays = state.replays.sort(durationDesc);
          break;
        case 'DURATION_ASC':
          replays = state.replays.sort(durationAsc);
          break;
        case 'COUNTRY':
          replays = state.replays.sort(countrySort);
          break;
        case 'CLICKS_PER_SECOND_DESC':
          replays = state.replays.sort(clicksPerSecondDesc);
          break;
        case 'CLICKS_PER_SECOND_ASC':
          replays = state.replays.sort(clicksPerSecondAsc);
          break;
        default:
          replays = state.replays.sort(timestampDesc);
          break;
      }
      return {
        sortValue,
        replays,
      };
    });
  }

  handleOutsideClick() {
    this.setState({
      currentReplay: undefined,
    });
  }

  handleItemClick(id) {
    this.setState((state) => {
      const { replayMap } = state;
      const currentReplay = replayMap[id];
      return {
        currentReplay,
      };
    });
  }

  render() {
    const {
      loading, replays, sortValue, currentReplay,
    } = this.state;
    return (
      <Page fullWidth>
        {currentReplay && (
        <Player
          replay={currentReplay}
          handleOutsideClick={this.handleOutsideClick}
        />
        )}
        <Card>
          <ResourceList
            loading={loading}
            resourceName={{ singular: 'replay', plural: 'replays' }}
            sortValue={sortValue}
            onSortChange={this.handleSortChange}
            sortOptions={sortOptions}
            items={replays}
            showHeader
            renderItem={item => <ReplayListItem handleItemClick={this.handleItemClick} {...item} />}
          />
        </Card>
      </Page>
    );
  }
}

Index.propTypes = {
  shopOrigin: PropTypes.string.isRequired,
};

export default Index;
