import {
  ResourceList,
  Page,
  Button,
  Frame,
  Toast,
  Card,
} from '@shopify/polaris';
import axios from 'axios';
import UAParser from 'ua-parser-js';
import { Context } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import React from 'react';
import PropTypes from 'prop-types';
import { sortOptions, sortOptionsMap } from '../utils/sort';
import ReplayListItem from '../components/ReplayListItem';
import Player from '../components/Player';

//const availableFilters = [
  //{
    //key: 'durationFilterGreater',
    //label: 'Duration (seconds) is greater',
    //operatorText: 'than',
    //type: FilterType.TextField,
  //},
  //{
    //key: 'durationFilterLess',
    //label: 'Duration (seconds) is less',
    //operatorText: 'than',
    //type: FilterType.TextField,
  //},
//]

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
    };
    this.resourceListRef = React.createRef();
    this.replayMap = {};
    this.handleSortChange = this.handleSortChange.bind(this);
    this.setToastMessage = this.setToastMessage.bind(this);
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
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
            />
          </Card>
          <style jsx>
            {`
            .refresh-button {
              z-index: 50;
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
