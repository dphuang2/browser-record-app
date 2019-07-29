import {
  Page, ResourceList, Avatar, TextStyle, Card,
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import axios from 'axios';
import PropTypes from 'prop-types';

class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      customers: [],
    };
  }

  async componentDidMount() {
    this.setState({
      loading: true,
    });
    const { shopOrigin } = this.props;
    const response = await axios.get(`/api/sessions/shop/${shopOrigin}`);
    this.setState({
      loading: false,
      customers: response.data,
    });
  }

  render() {
    const { loading, customers } = this.state;
    return (
      <Page fullWidth>
        <TitleBar title="Watch Replays" />
        <Card>
          <ResourceList
            loading={loading}
            resourceName={{ singular: 'customer', plural: 'customers' }}
            items={customers}
            renderItem={(item) => {
              const {
                browser, region, country, locationAvailable, sessionId,
              } = item;
              let locationString = 'Location Not Available';
              if (locationAvailable) locationString = `${region}, ${country}`;
              const media = <Avatar customer size="medium" name={locationString} />;

              return (
                <ResourceList.Item
                  id={sessionId}
                  media={media}
                >
                  <h3>
                    <TextStyle variation="strong">{locationString}</TextStyle>
                  </h3>
                  <div>{browser}</div>
                </ResourceList.Item>
              );
            }}
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
