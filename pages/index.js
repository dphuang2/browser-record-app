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
  DatePicker,
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
  NO_CUSTOMERS_FOUND_TOAST,
  HTTP_NO_CONTENT,
  TOTAL_CART_PRICE_FILTER_KEY,
  DURATION_FILTER_KEY,
  DEVICE_FILTER_KEY,
  NUM_CUSTOMERS_TO_SHOW_FILTER_KEY,
  ITEM_COUNT_FILTER_KEY,
  DATE_RANGE_FILTER_KEY,
  NO_REPLAY_FOUND_TOAST,
} from '../utils/constants';
import ReplayListItem from '../components/ReplayListItem';
import Player from '../components/Player';

class Index extends React.Component {

  constructor(props) {
    super(props);
    const currentDate = new Date();
    this.state = {
      loading: false,
      showToast: false,
      toastMessage: '',
      currentReplay: undefined,
      customers: [],
      sortValue: 'TIMESTAMP_DESC',
      datePickerDate: { month: currentDate.getMonth(), year: currentDate.getFullYear()},
      longestDuration: availableFilters[DURATION_FILTER_KEY].defaultValue[1],
      maxTotalCartPrice: availableFilters[TOTAL_CART_PRICE_FILTER_KEY].defaultValue[1],
      maxItemCount: availableFilters[ITEM_COUNT_FILTER_KEY].defaultValue[1],
      [DATE_RANGE_FILTER_KEY]: availableFilters[DATE_RANGE_FILTER_KEY].defaultValue,
      [TOTAL_CART_PRICE_FILTER_KEY]: availableFilters[TOTAL_CART_PRICE_FILTER_KEY].defaultValue,
      [DURATION_FILTER_KEY]: availableFilters[DURATION_FILTER_KEY].defaultValue,
      [DEVICE_FILTER_KEY]: availableFilters[DEVICE_FILTER_KEY].defaultValue,
      [NUM_CUSTOMERS_TO_SHOW_FILTER_KEY]: availableFilters[NUM_CUSTOMERS_TO_SHOW_FILTER_KEY].defaultValue,
      [ITEM_COUNT_FILTER_KEY]: availableFilters[ITEM_COUNT_FILTER_KEY].defaultValue,
      lastFilters: {},
    };
    this.resourceListRef = React.createRef();
    this.customerMap = {};
    this.replayCache = {};

    // Bindings
    this.handleSortChange = this.handleSortChange.bind(this);
    this.setToastMessage = this.setToastMessage.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.getCustomers = this.getCustomers.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.dismissToast = this.dismissToast.bind(this);
    this.handleClearAllFilters = this.handleClearAllFilters.bind(this);
    this.clearFilters = this.clearFilters.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.areAllFiltersDefault = this.areAllFiltersDefault.bind(this);
    this.isFilterDefault = this.isFilterDefault.bind(this);
    this.handleMonthChange = this.handleMonthChange.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
  }

  async componentDidMount() {
    /**
     * Redirect mobile to direct site instead of embedded
     */
    const app = this.context;
    const redirect = Redirect.create(app);
    const { decodedToken, shopOrigin, apiKey } = this.props;
    const redirectAuthUrl = `${app.localOrigin}/auth?shop=${shopOrigin}`;
    try {
      // This is the test that determines if we are inside shopify
      window.parent.location.href;
      /**
       * This is outside of shopify
       */
      if (decodedToken && !decodedToken.recurringChargeActivated) {
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
      if (decodedToken && !decodedToken.recurringChargeActivated) {
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

    this.getCustomers();
  }

  setToastMessage(toastMessage) {
    this.setState({
      showToast: true,
      toastMessage
    })
  }

  async getCustomers() {
    const filters = this.getFilters();
    const { shopOrigin } = this.props;
    const { loading, sortValue } = this.state;
    if (loading) {
      this.setToastMessage('No actions allowed while loading customers');
      return;
    }
    this.replayCache = {};
    this.setState({
      loading: true,
      lastFilters: filters,
      customers: [],
    });
    try {
      const response = await axios.get(`/api/sessions/shop/${shopOrigin}?filters=${encodeURIComponent(JSON.stringify(filters))}`);
      let { customers, longestDuration, maxTotalCartPrice, maxItemCount } = response.data;

      if (customers == null) {
        this.setState({ loading: false });
        this.setToastMessage(NO_CUSTOMERS_FOUND_TOAST);
        return;
      }

      this.setState((state) => {
        return {
          longestDuration: Math.ceil(Math.max(longestDuration, state.longestDuration)),
          maxTotalCartPrice: Math.ceil(Math.max(maxTotalCartPrice / 100, state.maxTotalCartPrice / 100)),
          maxItemCount: Math.max(maxItemCount, state.maxItemCount),
        }
      });
      customers = customers.filter((customer) => customer.id);
      customers.forEach(customer => {
        this.customerMap[customer.id] = customer;
      });
      if (customers.length == 0) {
        this.setState({ loading: false });
        this.setToastMessage(NO_CUSTOMERS_FOUND_TOAST);
        return;
      }
      customers = customers.sort(sortOptionsMap[sortValue]);
      this.setState({
        customers,
      });
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case HTTP_NO_CONTENT:
            this.setToastMessage(NO_CUSTOMERS_FOUND_TOAST);
            return;
          case HTTP_UNAUTHORIZED:
            this.setToastMessage(UNAUTHORIZED_TOAST);
            return;
        }
      }
    }
    this.setState({ loading: false });
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

  handleMonthChange(month, year) {
    this.setState({
      datePickerDate: { month, year }
    });
  }

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
      this.getCustomers();
  }

  handleOutsideClick(event) {
    this.setState({
      currentReplay: undefined,
    });
    event.preventDefault();
  }

  async handleItemClick(id) {
    if (this.replayCache[id] != undefined) {
      this.setState({ currentReplay: this.replayCache[id] });
      return;
    }
    const { shopOrigin } = this.props;
    this.setState({
      loading: true,
    });
    try {
      let response = await axios.get(`/api/sessions/shop/${shopOrigin}/customer/${encodeURIComponent(JSON.stringify(this.customerMap[id]))}`);
      response = await axios.get(response.data);
      const replay = JSON.parse(LZString.decompressFromBase64(response.data))
      if (replay === null) {
        this.setState({ loading: false });
        this.setToastMessage(NO_REPLAY_FOUND_TOAST);
        return;
      }
      this.setState({ currentReplay: replay });
      this.replayCache[id] = replay;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case HTTP_NO_CONTENT:
            this.setToastMessage(NO_CUSTOMERS_FOUND_TOAST);
            return;
          case HTTP_UNAUTHORIZED:
            this.setToastMessage(UNAUTHORIZED_TOAST);
            return;
        }
      }
    }
    this.setState({ loading: false });
  }

  handleSortChange(sortValue) {
    this.setState((state) => {
      return {
        sortValue,
        customers: state.customers.sort(sortOptionsMap[sortValue])
      }
    });
  }

  dismissToast() {
    this.setState({ showToast: false });
  }

  render() {
    const {
      loading,
      customers,
      sortValue,
      currentReplay,
      showToast,
      toastMessage,
      longestDuration,
      maxItemCount,
      maxTotalCartPrice,
      datePickerDate,
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
        key: NUM_CUSTOMERS_TO_SHOW_FILTER_KEY,
        label: 'Maximum number of customers to show',
        filter: (
          <RangeSlider
            label="Maximum number of customers to show"
            labelHidden
            value={this.state[NUM_CUSTOMERS_TO_SHOW_FILTER_KEY]}
            output
            min={0}
            max={200}
            step={1}
            onChange={this.handleFilterChange(NUM_CUSTOMERS_TO_SHOW_FILTER_KEY)}
            suffix="customers"
          />
        ),
      },
      {
        key: DATE_RANGE_FILTER_KEY,
        label: 'Date between',
        filter: (
          <DatePicker
            month={datePickerDate.month}
            year={datePickerDate.year}
            onChange={this.handleFilterChange(DATE_RANGE_FILTER_KEY)}
            onMonthChange={this.handleMonthChange}
            selected={this.state[DATE_RANGE_FILTER_KEY]}
            allowRange
          />
        ),
        shortcut: true
      },
      {
        key: ITEM_COUNT_FILTER_KEY,
        label: 'Item count between',
        filter: (
          <RangeSlider
            label="Item count between"
            labelHidden
            value={this.isFilterDefault(ITEM_COUNT_FILTER_KEY) ? [0,
              maxItemCount] : this.state[ITEM_COUNT_FILTER_KEY]}
            output
            min={0}
            max={maxItemCount}
            step={1}
            onChange={this.handleFilterChange(ITEM_COUNT_FILTER_KEY)}
            suffix="items"
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
              maxTotalCartPrice] : this.state[TOTAL_CART_PRICE_FILTER_KEY]}
            output
            min={0.00}
            max={maxTotalCartPrice}
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
              longestDuration] : this.state[DURATION_FILTER_KEY]}
            output
            min={0}
            max={longestDuration}
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
            selected={this.state[DEVICE_FILTER_KEY] || []}
            onChange={this.handleFilterChange(DEVICE_FILTER_KEY)}
            allowMultiple
          />
        ),
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
          <Button primary={!areFiltersStale} destructive={areFiltersStale} loading={loading} onClick={this.getCustomers}>
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
                resourceName={{ singular: 'customer', plural: 'customers' }}
                sortValue={sortValue}
                sortOptions={sortOptions}
                onSortChange={this.handleSortChange}
                items={customers}
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
