/* eslint-disable react/destructuring-assignment */
import {
  ResourceList,
  Page,
  Button,
  Frame,
  Card,
  Filters,
  ButtonGroup,
  RangeSlider,
} from '@shopify/polaris';
import axios from 'axios';
import UAParser from 'ua-parser-js';
import { Toast, Context } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import React from 'react';
import PropTypes from 'prop-types';
import { availableFilters, disambiguateLabel, isEmpty } from '../utils/filter';
import { sortOptions, sortOptionsMap } from '../utils/sort';
import ReplayListItem from '../components/ReplayListItem';
import Player from '../components/Player';

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
      lastFilters: {}
    };
    this.resourceListRef = React.createRef();
    this.replayMap = {};
    this.handleSortChange = this.handleSortChange.bind(this);
    this.setToastMessage = this.setToastMessage.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.getReplays = this.getReplays.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.dismissToast = this.dismissToast.bind(this);
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
    this.getReplays();
  }

  setToastMessage(toastMessage) {
    this.setState({
      showToast: true,
      toastMessage
    })
  }

  async getReplays() {
    const filters = this.getFilters();
    const { shopOrigin } = this.props;
    const { loading } = this.state;
    if (loading) {
      this.setToastMessage('No actions allowed while loading replays');
      return;
    }
    this.setState({
      loading: true,
      lastFilters: filters,
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

  getFilters() {
    let filters = {}
    Object.keys(availableFilters).forEach((key) => {
      const value = this.state[key];
      if (!isEmpty(value)) filters[key] = value;
    })
    return filters;
  }

  isFiltersStale() {
    const { lastFilters } = this.state;
    return !(JSON.stringify(this.getFilters()) === JSON.stringify(lastFilters));
  }

  handleFilterChange(key) {
    return (value) => {
      this.setState({ [key]: value });
    };
  }

  handleRemove(key) {
    this.setState({ [key]: null });
  }

  handleClearAll() {
    this.setState({
      durationFilter: null,
    });
  }

  async clearFilters() {
    let allEmpty = true;
    Object.keys(availableFilters).forEach((key) => {
      if (!isEmpty(this.state[key])) allEmpty = false;
    })
    if (!this.isFiltersStale() && allEmpty) {
      this.setToastMessage('All filters are cleared already');
      return;
    }
    await this.handleClearAll();
    if (await this.isFiltersStale()) this.getReplays();
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
            onChange={this.handleFilterChange('durationFilter')}
            suffix="seconds"
          />
        ),
      },
    ]

    const isFiltersStale = this.isFiltersStale();
    const filterControl = (
      <Filters
        filters={filters}
        appliedFilters={appliedFilters}
        onClearAll={this.handleClearAll}
      >
        <ButtonGroup segmented>
          <Button loading={loading} onClick={this.clearFilters}>Clear Filters</Button>
          <Button primary={!isFiltersStale} destructive={isFiltersStale} loading={loading} onClick={this.getReplays}>
            Refresh
          </Button>
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
