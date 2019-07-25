import {
  Page, ResourceList, Avatar, TextStyle, Card,
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';

class Index extends React.Component {
  render() {
    return (
      <Page fullWidth >
        <TitleBar title="Watch Replays"/>
        <Card>
          <ResourceList
            resourceName={{ singular: 'customer', plural: 'customers' }}
            items={[
              {
                id: 341,
                url: 'customers/341',
                name: 'Mae Jemison',
                location: 'Decatur, USA',
              },
              {
                id: 256,
                url: 'customers/256',
                name: 'Ellen Ochoa',
                location: 'Los Angeles, USA',
              },
            ]}
            renderItem={(item) => {
              const {
                id, url, name, location,
              } = item;
              const media = <Avatar customer size="medium" name={name} />;

              return (
                <ResourceList.Item
                  id={id}
                  url={url}
                  media={media}
                  accessibilityLabel={`View details for ${name}`}
                >
                  <h3>
                    <TextStyle variation="strong">{name}</TextStyle>
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

export default Index;
