/* eslint-disable react/destructuring-assignment */
import {
  ResourceList,
  Page,
  Button,
  Frame,
  Toast,
  Card,
  Filters,
  ButtonGroup,
  RangeSlider,
} from '@shopify/polaris';
import axios from 'axios';
import UAParser from 'ua-parser-js';
import { Context } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import React from 'react';
import PropTypes from 'prop-types';
import { availableFilters, disambiguateLabel, isEmpty } from '../utils/filter';
import { sortOptions, sortOptionsMap } from '../utils/sort';
import ReplayListItem from '../components/ReplayListItem';
import Player from '../components/Player';
import './index.scss';

class Index extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      showToast: false,
      toastMessage: '',
      currentReplay: undefined,
      replays: [],
      sortValue: 'TIMESTAMP_DESC',
      durationFilter: null,
      shortestDuration: Number.MAX_SAFE_INTEGER,
      longestDuration: Number.MIN_SAFE_INTEGER,
    };
    this.resourceListRef = React.createRef();
    this.replayMap = {};
    this.handleSortChange = this.handleSortChange.bind(this);
    this.setToastMessage = this.setToastMessage.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.dismissToast = this.dismissToast.bind(this);
    this.handleRefreshButtonClick = this.handleRefreshButtonClick.bind(this);
    this.applyFilters = this.applyFilters.bind(this);
    this.handleClearAll = this.handleClearAll.bind(this);
    this.clearFilters = this.clearFilters.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
  }

  async componentDidMount() {
    const app = this.context;
    const redirect = Redirect.create(app);
    if (UAParser(window.navigator.userAgent).device.type) {
      try {
        window.parent.location.href;
      } catch (error) {
        const { shopOrigin } = this.props;
        const url = `${app.localOrigin}/auth?shop=${shopOrigin}`;
        redirect.dispatch(Redirect.Action.REMOTE, url);
      }
    }
    this.getReplays([]);
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
    } catch (error) {
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
      const { replays, shortestDuration, longestDuration } = state;
      replays.push(replay);
      if (replay.duration < shortestDuration)
        return { replays, shortestDuration: Math.floor(replay.duration) }
      else if (replay.duration > longestDuration)
        return { replays, longestDuration: Math.ceil(replay.duration) }
      return { replays }
    })
  }

  handleRemove(key) {
    this.setState({ [key]: null });
  }

  handleClearAll() {
    this.setState({
      durationFilter: null,
    });
  }

  handleChange(key) {
    return (value) => {
      this.setState({ [key]: value });
    };
  }

  async clearFilters() {
    this.handleClearAll();
    this.applyFilters();
  }

  async applyFilters() {
    let filters = [];
    Object.keys(availableFilters).forEach((key) => {
      const value = this.state[key];
      if (!isEmpty(value)) filters.push({ key, value })
    })
    await this.getReplays(filters);
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

  handleSortChange(sortValue) {
    this.setState((state) => {
      return {
        sortValue,
        replays: state.replays.sort(sortOptionsMap[sortValue])
      }
    });
  }

  dismissToast() {
    this.setState({ showToast: false });
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
      showToast,
      toastMessage,
      durationFilter,
      shortestDuration,
      longestDuration,
    } = this.state;

    const appliedFilters = Object.keys(this.state)
      .filter((key) => !isEmpty(this.state[key]) && key in availableFilters)
      .map((key) => {
        return {
          key,
          label: disambiguateLabel(key, this.state[key]),
          onRemove: this.handleRemove,
        };
      });

    const filters = [
      {
        key: 'durationFilter',
        label: 'Duration between',
        filter: (
          <RangeSlider
            label="Duration of session is between"
            labelHidden
            value={durationFilter || [shortestDuration, longestDuration]}
            output
            min={shortestDuration}
            max={longestDuration}
            step={1}
            onChange={this.handleChange('durationFilter')}
          />
        ),
      },
    ]

    const filterControl = (
      <Filters
        filters={filters}
        appliedFilters={appliedFilters}
        onClearAll={this.handleClearAll}
      >
        <ButtonGroup segmented>
          <Button loading={loading} onClick={this.clearFilters}>Clear Filters</Button>
          <Button loading={loading} onClick={this.applyFilters}>Apply Filters</Button>
        </ButtonGroup>
      </Filters>
    );

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
                primary
              >
                Refresh
              </Button>
            </div>
            <div ref={this.resourceListRef}>
              <ResourceList
                loading={loading}
                resourceName={{ singular: 'replay', plural: 'replays' }}
                sortValue={sortValue}
                sortOptions={sortOptions}
                onSortChange={this.handleSortChange}
                items={replays}
                showHeader
                renderItem={item => <ReplayListItem handleItemClick={this.handleItemClick} {...item} />}
                filterControl={filterControl}
              />
            </div>
          </Card>
          <style jsx global>
            {`
            .Polaris-Filters-ConnectedFilterControl__MoreFiltersButtonContainer .Polaris-Button {
              border-top-left-radius: 3px !important;
              border-bottom-left-radius: 3px !important;
            }
            .Polaris-Filters-ConnectedFilterControl__CenterContainer {
              display: none;
            }
            `}
          </style>
          <style jsx>
            {`
            .refresh-button {
              z-index: 50;
              top: 8px;
              left: calc(100% - 99px);
              position: relative;
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
