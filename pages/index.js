import {
  ResourceList,
  Page,
  Button,
  Frame,
  Toast,
  Card,
  FilterType,
} from '@shopify/polaris';
import axios from 'axios';
import UAParser from 'ua-parser-js';
import { Context } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import React from 'react';
import PropTypes from 'prop-types';
import ReplayListItem from '../components/ReplayListItem';
import Player from '../components/Player';

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

const availableFilters = [
  {
    key: 'durationFilterGreater',
    label: 'Duration (seconds) is greater',
    operatorText: 'than',
    type: FilterType.TextField,
  },
  {
    key: 'durationFilterLess',
    label: 'Duration (seconds) is less',
    operatorText: 'than',
    type: FilterType.TextField,
  },
]

class Index extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      showToast: false,
      toastMessage: '',
      currentReplay: undefined,
      replays: [],
      appliedFilters: [],
      sortValue: 'TIMESTAMP_DESC',
    };
    this.resourceListRef = React.createRef();
    this.replayMap = {};
    this.handleSortChange = this.handleSortChange.bind(this);
    this.setToastMessage = this.setToastMessage.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleFiltersChange = this.handleFiltersChange.bind(this);
    this.dismissToast = this.dismissToast.bind(this);
    this.handleRefreshButtonClick = this.handleRefreshButtonClick.bind(this);
  }

  async componentDidMount() {
    const app = this.context;
    const redirect = Redirect.create(app);
    if (UAParser(window.navigator.userAgent).device.type) {
      try {
        window.parent.location.href;
      } catch(error) {
        const { shopOrigin } = this.props;
        const url = `${app.localOrigin}/auth?shop=${shopOrigin}`;
        redirect.dispatch(Redirect.Action.REMOTE, url);
      }
    }
    const { appliedFilters } = this.state;
    this.getReplays(appliedFilters);
  }

  setToastMessage(toastMessage) {
    this.setState({
      showToast: true,
      toastMessage
    })
  }

  async getReplays(filters) {
    const { shopOrigin } = this.props;
    const { loading } = this.state;
    if (loading) {
      this.setToastMessage('No actions allowed while loading replays');
      return;
    }
    this.setState({
      loading: true,
      appliedFilters: filters,
      replays: [],
    });
    try {
      const response = await axios.get(`/api/sessions/shop/${shopOrigin}?filters=${encodeURIComponent(JSON.stringify(filters))}`);
      const replays = response.data;

      let promises = [];
      for (let i = 0; i < replays.length; i += 1) {
        const url = replays[i];
        promises.push(this.getReplay(url));
      }
      await Promise.all(promises)
      this.setState(({ replays, sortValue }) => {
        return {
          loading: false,
          replays: replays.sort(sortOptionsMap[sortValue])
        }
      })
    } catch(error) {
      if (error.response) {
        switch (error.response.status) {
          case 404:
            this.setState({
              loading: false,
            })
            return;
        }
      }
    }
  }

  async getReplay(url) {
    const response = await axios.get(url);
    const replay = response.data;
    this.replayMap[replay.id] = replay;
    this.setState(state => {
      const { replays } = state;
      replays.push(replay);
      return {
        replays,
      }
    })
  }

  dismissToast() {
    this.setState({showToast: false});
  }

  async handleFiltersChange(appliedFilters) {
    await this.getReplays(appliedFilters);
  }

  handleSortChange(sortValue) {
    this.setState((state) => {
      return {
        sortValue,
        replays: state.replays.sort(sortOptionsMap[sortValue])
      }
    });
  }

  handleOutsideClick(event) {
    this.setState({
      currentReplay: undefined,
    });
    event.preventDefault();
  }

  handleItemClick(id) {
    this.setState({ currentReplay: this.replayMap[id], });
  }

  handleRefreshButtonClick() {
    const { appliedFilters } = this.state;
    this.getReplays(appliedFilters);
  }

  render() {
    const {
      loading,
      replays,
      sortValue,
      currentReplay,
      appliedFilters,
      showToast,
      toastMessage
    } = this.state;
    return (
      <Frame>
        <Page>
          {showToast && (
            <Toast content={toastMessage} onDismiss={this.dismissToast} />
          )}
          {currentReplay && (
            <Player
              resourceListRef={this.resourceListRef}
              replay={currentReplay}
              handleOutsideClick={this.handleOutsideClick}
            />
          )}
          <Card>
            <div className="refresh-button">
              <Button
                onClick={this.handleRefreshButtonClick}
                loading={loading}
              >
                    Refresh
              </Button>
            </div>
            <ResourceList
              ref={this.resourceListRef}
              loading={loading}
              resourceName={{ singular: 'replay', plural: 'replays' }}
              sortValue={sortValue}
              sortOptions={sortOptions}
              onSortChange={this.handleSortChange}
              items={replays}
              showHeader
              renderItem={item => <ReplayListItem handleItemClick={this.handleItemClick} {...item} />}
              filterControl={(
                <ResourceList.FilterControl
                  filters={availableFilters}
                  appliedFilters={appliedFilters}
                  onFiltersChange={this.handleFiltersChange}
                />
              )}
            />
          </Card>
          <style jsx>
            {`
            .refresh-button {
              top: 16px;
              right: 16px;
              z-index: 50;
              position: absolute;
            }
                `}
          </style>
          <style jsx global>
            {`
              .Polaris-Card {
                position: relative;
              }
              .Polaris-Connected__Item--connection .Polaris-Button {
                border-top-right-radius: 3px !important;
                border-bottom-right-radius: 3px !important;
              }
            .Polaris-Connected__Item--primary {
              display: none !important;
            }
                `}
          </style>
        </Page>
      </Frame>
    );
  }
}

Index.propTypes = {
  shopOrigin: PropTypes.string.isRequired,
};
Index.contextType = Context;

export default Index;
