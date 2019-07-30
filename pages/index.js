import {
  ResourceList, Page, Card,
} from '@shopify/polaris';
import axios from 'axios';
import PropTypes from 'prop-types';
import ReplayListItem from '../components/ReplayListItem';

function createSortCompare(key, direction) {
  return function compare(a, b) {
    if (a[key] < b[key]) return -1 * direction;
    if (a[key] > b[key]) return 1 * direction;
    return 0;
  };
}

class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      replays: [],
      sortValue: 'TIMESTAMP_DESC',
    };
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
  }

  async componentDidMount() {
    this.setState({
      loading: true,
    });
    const { shopOrigin } = this.props;
    const response = await axios.get(`/api/sessions/shop/${shopOrigin}`);
    this.setState({
      loading: false,
      replays: response.data,
    });
  }

  handleSortChange(sortValue) {
    this.setState((state) => {
      let replays;
      switch (sortValue) {
        case 'TIMESTAMP_DESC':
          replays = state.replays.sort(createSortCompare('timestamp', -1));
          break;
        case 'TIMESTAMP_ASC':
          replays = state.replays.sort(createSortCompare('timestamp', 1));
          break;
        case 'CLICKS_DESC':
          replays = state.replays.sort(createSortCompare('numClicks', -1));
          break;
        case 'CLICKS_ASC':
          replays = state.replays.sort(createSortCompare('numClicks', 1));
          break;
        case 'DURATION_DESC':
          replays = state.replays.sort(createSortCompare('duration', -1));
          break;
        case 'DURATION_ASC':
          replays = state.replays.sort(createSortCompare('duration', 1));
          break;
        default:
          replays = state.replays.sort(createSortCompare('timestamp', 1));
          break;
      }
      return {
        sortValue,
        replays,
      };
    });
  }

  handleItemClick(id) {
    console.log(id);
  }

  render() {
    const { loading, replays, sortValue } = this.state;
    return (
      <Page fullWidth>
        <Card>
          <ResourceList
            loading={loading}
            resourceName={{ singular: 'replay', plural: 'replays' }}
            sortValue={sortValue}
            onSortChange={this.handleSortChange}
            sortOptions={[
              { label: 'Newest session', value: 'TIMESTAMP_DESC' },
              { label: 'Oldest session', value: 'TIMESTAMP_ASC' },
              { label: 'Most clicks', value: 'CLICKS_DESC' },
              { label: 'Least clicks', value: 'CLICKS_ASC' },
              { label: 'Longest duration', value: 'DURATION_DESC' },
              { label: 'Shortest duration', value: 'DURATION_ASC' },
            ]}
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
