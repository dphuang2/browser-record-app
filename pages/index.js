/* eslint-disable jsx-a11y/anchor-is-valid */
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
  ChoiceList,
  Link,
} from '@shopify/polaris';
import axios from 'axios';
import UAParser from 'ua-parser-js';
import { Toast, Context, Modal } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import React from 'react';
import PropTypes from 'prop-types';
import LZString from 'lz-string';
import { availableFilters, disambiguateLabel, defaultFilterMap } from '../utils/filter';
import { sortOptions, sortOptionsMap } from '../utils/sort';
import { arraysEqual } from '../utils/util';
import {
  HERO_TITLE,
  HERO_MESSAGE,
  HTTP_UNAUTHORIZED,
  UNAUTHORIZED_TOAST,
  NO_REPLAYS_FOUND_TOAST,
  HTTP_NO_CONTENT,
  TOTAL_CART_PRICE_FILTER_KEY,
  DURATION_FILTER_KEY,
  DEVICE_FILTER_KEY,
  NUM_REPLAYS_TO_SHOW_FILTER_KEY,
} from '../utils/constants';
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
      [TOTAL_CART_PRICE_FILTER_KEY]: availableFilters[TOTAL_CART_PRICE_FILTER_KEY].defaultValue,
      [DURATION_FILTER_KEY]: availableFilters[DURATION_FILTER_KEY].defaultValue,
      [DEVICE_FILTER_KEY]: availableFilters[DEVICE_FILTER_KEY].defaultValue,
      [NUM_REPLAYS_TO_SHOW_FILTER_KEY]: availableFilters[NUM_REPLAYS_TO_SHOW_FILTER_KEY].defaultValue,
      lastFilters: {},
    };
    this.resourceListRef = React.createRef();
    this.replayMap = {};

    this.longestDuration = availableFilters[DURATION_FILTER_KEY].defaultValue[1];
    this.maxTotalCartPrice = availableFilters[TOTAL_CART_PRICE_FILTER_KEY].defaultValue[1];

    // Bindings
    this.handleSortChange = this.handleSortChange.bind(this);
    this.setToastMessage = this.setToastMessage.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.getReplays = this.getReplays.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.dismissToast = this.dismissToast.bind(this);
    this.handleClearAllFilters = this.handleClearAllFilters.bind(this);
    this.clearFilters = this.clearFilters.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.areAllFiltersDefault = this.areAllFiltersDefault.bind(this);
    this.isFilterDefault = this.isFilterDefault.bind(this);
  }

  async componentDidMount() {
    /**
     * Redirect mobile to direct site instead of embedded
     */
    const app = this.context;
    const redirect = Redirect.create(app);
    const { decodedToken, shopOrigin, apiKey } = this.props;
    const { recurringChargeActivated } = decodedToken;
    const redirectAuthUrl = `${app.localOrigin}/auth?shop=${shopOrigin}`;
    try {
      // This is the test that determines if we are inside shopify
      window.parent.location.href;
      /**
       * This is outside of shopify
       */
      if (!recurringChargeActivated) {
        window.location.assign(redirectAuthUrl);
        return;
      }
      if (!UAParser(window.navigator.userAgent).device.type) {
        window.location.assign(`https://${shopOrigin}/admin/apps/${apiKey}`)
        return;
      }
    } catch (error) {
      /**
       * This is inside shopify
       */
      if (!recurringChargeActivated) {
        redirect.dispatch(Redirect.Action.REMOTE, redirectAuthUrl);
        return;
      }
      if (UAParser(window.navigator.userAgent).device.type) {
        redirect.dispatch(Redirect.Action.REMOTE, redirectAuthUrl);
        return;
      }
    }

    const { redirectedFromBilling, visitCount } = decodedToken;
    const showHero = redirectedFromBilling && visitCount == 1;
    this.heroModal = showHero && (
      <Modal
        title={HERO_TITLE}
        message={HERO_MESSAGE}
        open={showHero}
      />
    )

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
      const { urls, longestDuration, maxTotalCartPrice } = response.data;

      if (urls == null) {
        this.setState({
          loading: false,
        });
        this.setToastMessage(NO_REPLAYS_FOUND_TOAST);
        return;
      }

      this.longestDuration = Math.ceil(longestDuration);
      this.maxTotalCartPrice = Math.ceil(maxTotalCartPrice / 100);

      const getReplay = async (url) => {
        try {
          const response = await axios.get(url);
          const replay = JSON.parse(LZString.decompressFromBase64(response.data));
          this.replayMap[replay.id] = replay;
          this.setState(({ replays }) => {
            replays.push(replay);
            return { replays };
          })
        } catch (error) {
          // do nothing
        }
      };

      let promises = [];
      for (let i = 0; i < urls.length; i += 1) {
        const url = urls[i];
        promises.push(getReplay(url));
      }
      await Promise.all(promises)
      this.setState(({ replays, sortValue }) => {
        if (replays.length == 0)
          this.setToastMessage(NO_REPLAYS_FOUND_TOAST);
        return {
          loading: false,
          replays: replays.sort(sortOptionsMap[sortValue])
        }
      })
    } catch (error) {
      if (error.response) {
        this.setState({
          loading: false,
        });
        switch (error.response.status) {
          case HTTP_NO_CONTENT:
            this.setToastMessage(NO_REPLAYS_FOUND_TOAST);
            return;
          case HTTP_UNAUTHORIZED:
            this.setToastMessage(UNAUTHORIZED_TOAST);
            return;
        }
      }
    }
  }

  getFilters() {
    let filters = {}
    Object.keys(availableFilters).forEach((key) => {
      const value = this.state[key];
      if (!this.isFilterDefault(key)) filters[key] = value;
    })
    return filters;
  }

  handleFilterChange = (key) => (value) => {
    this.setState({ [key]: value });
  };

  /**
   * This function checks if the current applied filters (the ones that show up
   * in the UI) reflect the filters used to get the current set of replays.
   */
  areFiltersStale() {
    const { lastFilters } = this.state;
    return !(JSON.stringify(this.getFilters()) === JSON.stringify(lastFilters));
  }

  isFilterDefault(filter) {
    if (Array.isArray(filter))
      return arraysEqual(this.state[filter], availableFilters[filter].defaultValue);
    return this.state[filter] === availableFilters[filter].defaultValue;
  }

  areAllFiltersDefault() {
    let allDefault = true;
    Object.keys(availableFilters).forEach((key) => {
      if (!this.isFilterDefault(key))
        allDefault = false;
    })
    return allDefault;
  }

  handleRemove(key) {
    this.setState({ [key]: availableFilters[key].defaultValue });
  }

  async handleClearAllFilters() {
    await this.setState(defaultFilterMap());
  }

  async clearFilters() {
    if (!this.areFiltersStale() && this.areAllFiltersDefault()) {
      this.setToastMessage('All filters are cleared already');
      return;
    }
    await this.handleClearAllFilters();
    if (this.areFiltersStale())
      this.getReplays();
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
      numReplaysToShow,
      deviceFilter,
      totalCartPriceFilter,
    } = this.state;

    const appliedFilters = Object.keys(this.state)
      .filter((key) => key in availableFilters && !this.isFilterDefault(key))
      .map((key) => {
        return {
          key,
          label: disambiguateLabel(key, this.state[key]),
          onRemove: this.handleRemove,
        };
      });

    const filters = [
      {
        key: NUM_REPLAYS_TO_SHOW_FILTER_KEY,
        label: 'Maximum number of replays to show',
        filter: (
          <RangeSlider
            label="Maximum number of replays to show"
            labelHidden
            value={numReplaysToShow}
            output
            min={0}
            max={200}
            step={1}
            onChange={this.handleFilterChange(NUM_REPLAYS_TO_SHOW_FILTER_KEY)}
            suffix="replays"
          />
        ),
      },
      {
        key: TOTAL_CART_PRICE_FILTER_KEY,
        label: 'Total cart price between',
        filter: (
          <RangeSlider
            label="Total cart price between"
            labelHidden
            value={this.isFilterDefault(TOTAL_CART_PRICE_FILTER_KEY) ? [0,
              this.maxTotalCartPrice] : totalCartPriceFilter}
            output
            min={0.00}
            max={this.maxTotalCartPrice}
            step={0.50}
            onChange={this.handleFilterChange(TOTAL_CART_PRICE_FILTER_KEY)}
            prefix="$"
          />
        ),
      },
      {
        key: DURATION_FILTER_KEY,
        label: 'Duration between',
        filter: (
          <RangeSlider
            label="Duration of session is between"
            labelHidden
            value={this.isFilterDefault(DURATION_FILTER_KEY) ? [0,
              this.longestDuration] : durationFilter}
            output
            min={0}
            max={this.longestDuration}
            step={1}
            onChange={this.handleFilterChange(DURATION_FILTER_KEY)}
            suffix="seconds"
          />
        ),
      },
      {
        key: DEVICE_FILTER_KEY,
        label: 'Device',
        filter: (
          <ChoiceList
            title="Device"
            titleHidden
            choices={[
              { label: 'Desktop', value: 'desktop' },
              { label: 'Mobile', value: 'mobile' },
            ]}
            selected={deviceFilter || []}
            onChange={this.handleFilterChange(DEVICE_FILTER_KEY)}
            allowMultiple
          />
        ),
        shortcut: true,
      },
    ]

    const areFiltersStale = this.areFiltersStale();
    const filterControl = (
      <Filters
        filters={filters}
        appliedFilters={appliedFilters}
        onClearAll={this.handleClearAllFilters}
      >
        <ButtonGroup segmented>
          <Button loading={loading} onClick={this.clearFilters}>Clear Filters</Button>
          <Button primary={!areFiltersStale} destructive={areFiltersStale} loading={loading} onClick={this.getReplays}>
            Refresh
          </Button>
        </ButtonGroup>
      </Filters>
    );

    return (
      <Frame>
        <Page>
          {this.heroModal}
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
            <div className="support">
              <Link external url="/static/faq.html"> Support </Link>
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
            .support {
              text-align: right;
              padding-top: 1.6rem;
              padding-right: 1.6rem;
            }
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
  apiKey: PropTypes.string.isRequired,
  decodedToken: PropTypes.shape({
    recurringChargeActivated: PropTypes.bool.isRequired,
    redirectedFromBilling: PropTypes.bool.isRequired,
    visitCount: PropTypes.number.isRequired,
  }).isRequired,
};
Index.contextType = Context;

export default Index;
