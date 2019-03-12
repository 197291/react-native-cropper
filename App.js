import React from 'react';
import { Dimensions, Button, ImageBackground } from 'react-native';
import ImageManipulator from './manipulator/ImageManipulator';

export default class App extends React.Component {
  state = {
    isVisible: false,
    uri: 'https://res.cloudinary.com/hotelcloud-dev/image/upload/v1551338194/permanent/eb3cb5082af1063ecd0b4603e74a4494e56ae3d01cb012429df1c67b_rgktb8.jpg',
  }
  onToggleModal = () => {
    const { isVisible } = this.state;
    this.setState({ isVisible: !isVisible });
  }
  render() {
    const { uri, isVisible } = this.state;
    const { width, height } = Dimensions.get('window');
    return (
      <ImageBackground
        resizeMode="contain"
        style={{
          justifyContent: 'center', padding: 20, alignItems: 'center', height: height, width: width, backgroundColor: 'black',
        }}
        source={{ uri: uri }}
      >
        <Button title="Open Image Editor" onPress={() => this.setState({ isVisible: true })} />
        {isVisible && (
          <ImageManipulator
            photo={{
              uri: uri,
              width: 3994,
              height: 3993
            }}
            isVisible={isVisible}
            onPictureChoosed={(uriM) => this.setState({ uri: uriM })}
            onToggleModal={this.onToggleModal}
            // metrics={null}
            // aspect={[ [ 100 ], [ 4, 1 ] ]}
            metrics={{ left: 1149, top: 2130, height: 1009, width: 2691 }}
            // aspect={[ [ 10, 1 ] ]}
            aspect={[ [ 10, 1 ], [ 4, 2 ], [ 100 ] ]}
          />
        )}
      </ImageBackground>
    );
  }
}
