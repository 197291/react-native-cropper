import React from 'react';
import { Dimensions, Button, ImageBackground } from 'react-native';
import ImageManipulator from './manipulator/ImageManipulator';

export default class App extends React.Component {
  state = {
    isVisible: false,
    uri: 'http://res.cloudinary.com/hotelcloud-dev/image/upload/v1551767421/permanent/vuyfoong5t1jmk65sqla.png',
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
              width: 1125,
              height: 750
            }}
            isVisible={isVisible}
            onPictureChoosed={(uriM) => this.setState({ uri: uriM })}
            onToggleModal={this.onToggleModal}
            fullSize={true}
            metrics={[ {
              top: 50,
              left: 50,
              width: 200,
              height: 100,
              aspect: [ 2, 1 ]
            } ]}
          />
        )}
      </ImageBackground>
    );
  }
}
