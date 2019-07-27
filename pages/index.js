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
    const response = await axios.get(`/api/customers/${shopOrigin}`);
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
                _id, browser, location,
              } = item;
              const media = <Avatar customer size="medium" name={browser} />;

              return (
                <ResourceList.Item
                  id={_id}
                  media={media}
                >
                  <h3>
                    <TextStyle variation="strong">{browser}</TextStyle>
                  </h3>
                  <div>{location}</div>
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
