import React, { Component } from 'react';
import {
  PanResponder, Dimensions, Image, ScrollView, Modal, View, Text, SafeAreaView
} from 'react-native';
import { Picker } from 'native-base';
import * as Animatable from 'react-native-animatable';
import PropTypes from 'prop-types';
import AutoHeightImage from 'react-native-auto-height-image';
// eslint-disable-next-line import/no-extraneous-dependencies
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import uuid from 'uuid';
import HybridTouch from '../HybridTouch';
// eslint-enable-next-line import/no-extraneous-dependencies

import getDefaultCrop from './utils';

const windowWidth = Dimensions.get('window').width;
// const windowHeight = Dimensions.get('window').height - 20;

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 100;

const FULL_SIZE = {
  fullSize: true,
  id: uuid(),
};

class ImgManipulator extends Component {
  constructor(props) {
    super(props);
    const { photo, aspect, metrics } = this.props;

    this.state = {
      uri: photo.uri,
      metrics: metrics,
    };

    const squareMetrics = this.getDefaultSquareMetrics(metrics);

    this.scrollOffset = 0;

    this.currentPos = {
      left: squareMetrics.left,
      top: squareMetrics.top,
    };

    this.aspect = !metrics ? aspect[0] : [ metrics.width, metrics.height ];
    this.currentSize = {
      width: squareMetrics.width,
      height: squareMetrics.height,
    };

    this.maxSizes = {
      width: null,
      height: null,
    };

    this.minHeight = squareMetrics.height;
    this.minWidth = squareMetrics.width;

    this.isResizing = false;

    this._panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: () => {
        this.scrollView.setNativeProps({ scrollEnabled: false });
      },
      onPanResponderMove: (evt, gestureState) => {
        // console.log('-----onPanResponderMove------', gestureState, this.currentPos, this.currentSize);
        if (!this.isResizing && gestureState.x0 < this.currentPos.left + this.currentSize.width * 0.9) {
          const left = gestureState.moveX - this.currentSize.width / 2;
          const top = gestureState.moveY + this.scrollOffset - this.currentSize.height / 2 - 85;

          this.square.transitionTo(
            {
              left: this.calculateLeftCoordsOfSquare(left),
              top: this.calculateTopCoordsOfSquare(top), /**  OFFSET */
            },
            0,
          );
        } else {
          this.isResizing = true;
          let aspect = null;
          const squareWidth = gestureState.moveX - this.currentPos.left;
          let squareHeight = gestureState.moveY - this.currentPos.top + this.scrollOffset - 45; /** OFFSET */

          if (this.isValidAspect()) {
            aspect = this.aspect[0] / this.aspect[1];
            squareHeight = squareWidth / aspect;
          }

          const baseWidth = this.minWidth || DEFAULT_WIDTH;
          const baseHeight = this.minHeight || DEFAULT_HEIGHT;

          this.square.transitionTo(
            { width: squareWidth < baseWidth ? baseWidth : squareWidth,
              height: squareHeight < baseHeight ? baseHeight : squareHeight
            },
            0,
          );
        }
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: () => {
        this.scrollView.setNativeProps({ scrollEnabled: true });
        this.isResizing = false;
        // The user has released all touches while this view is the
        // responder. This typically means a gesture has succeeded
      },
      onPanResponderTerminate: () => {
        // Another component has become the responder, so this gesture
        // should be cancelled
      },
      onShouldBlockNativeResponder: () => true
      ,
    });
  }


  getDefaultSquareMetrics(metrics) {
    let metricsDefault = {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      left: 0,
      top: 0,
    };

    const { photo, aspect } = this.props;

    if (metrics) {
      metricsDefault = { ...metrics };
    } else {
      const asp = aspect[0];
      metricsDefault = { ...metricsDefault, ...getDefaultCrop(photo.width, photo.height, asp[0], asp[1]) };
      console.log('----metricsDefault----', metricsDefault);
    }

    return metricsDefault;
  }

  onToggleModal = () => {
    this.props.onToggleModal();
  }

  setCurrentSizes = (width = 100, height = 100) => {
    this.currentSize.width = width;
    this.currentSize.height = height;
  }

  setMinSizes = (width, height) => {
    this.minHeight = height;
    this.minWidth = width;
  }

  calculateMetricsOfSquareCrop(imgWidthZip, imgHeightZip) {
    const { photo } = this.props;
    let cropWidth = DEFAULT_WIDTH;
    let cropHeight = DEFAULT_HEIGHT;
    const ratioImgWidth = imgWidthZip / photo.width;
    const ratioImgHeight = imgHeightZip / photo.height;
    cropWidth = this.currentSize.width * ratioImgWidth;
    cropHeight = this.currentSize.height * ratioImgHeight;
    // console.log('--------cropWidth, cropHeight--------', cropWidth, cropHeight);
    return { cropWidth: cropWidth, cropHeight: cropHeight };
  }

  calculateCurrentPosition(imgWidthZip, imgHeightZip) {
    const { photo } = this.props;
    let left = 0;
    let top = 0;
    const ratioImgWidth = imgWidthZip / photo.width;
    const ratioImgHeight = imgHeightZip / photo.height;
    left = this.currentPos.left * ratioImgWidth;
    top = this.currentPos.top * ratioImgHeight;
    return { topCoord: top, leftCoord: left };
  }

  setMetricsOfSquareCrop(imgWidthZip, imgHeightZip) {
    if (this.currentSize && imgWidthZip && imgHeightZip) {
      const { cropWidth, cropHeight } = this.calculateMetricsOfSquareCrop(imgWidthZip, imgHeightZip);
      this.setCurrentSizes(cropWidth, cropHeight);
      this.setMinSizes(cropWidth, cropHeight);
      let top = this.currentPos.top;
      let left = this.currentPos.left;

      if (this.props.metrics) {
        const { topCoord, leftCoord } = this.calculateCurrentPosition(imgWidthZip, imgHeightZip);
        top = topCoord;
        left = leftCoord;
        this.setCurrentPos(top, left);
      }

      this.setSizesForSquareCrop(
        cropWidth,
        cropHeight,
        top,
        left
      );
      this.forceUpdate();
    }
  }

  onCropImage = () => {
    let imgWidth = 0;
    let imgHeight = 0;
    // const { photo } = this.props
    const { uri } = this.state;
    Image.getSize(uri, (width2, height2) => {
      imgWidth = width2;
      imgHeight = height2;
      console.log('width, height', imgWidth, imgHeight, this.maxSizes.height, this.maxSizes.width);
      const heightRatio = this.currentSize.height / this.maxSizes.height;
      const offsetHeightRatio = this.currentPos.top / this.maxSizes.height;

      const isOutOfBoundsY = imgHeight < (imgHeight * heightRatio) + imgHeight * offsetHeightRatio;
      const offsetMaxHeight = (imgHeight * heightRatio + imgHeight * offsetHeightRatio) - imgHeight;

      const isOutOfBoundsX = imgWidth < (this.currentPos.left * imgWidth / windowWidth) + (this.currentSize.width * imgWidth / windowWidth);
      const offsetMaxWidth = (this.currentPos.left * imgWidth / windowWidth) + (this.currentSize.width * imgWidth / windowWidth) - imgWidth;

      const isOutOfBoundsLeft = (this.currentPos.left * imgWidth / windowWidth) < 0;
      const isOutOfBoundsTop = (imgHeight * offsetHeightRatio) < 0;

      const originX = isOutOfBoundsLeft ? 0 : this.currentPos.left * imgWidth / windowWidth;
      const originY = isOutOfBoundsTop ? 0 : imgHeight * offsetHeightRatio;
      let cropWidth = this.currentSize.width * imgWidth / windowWidth;
      let cropHeight = imgHeight * heightRatio;

      if (isOutOfBoundsX) {
        cropWidth = cropWidth - offsetMaxWidth;
      }
      if (isOutOfBoundsY) {
        cropHeight = cropHeight - offsetMaxHeight;
      }
      if (isOutOfBoundsLeft) {
        cropWidth = cropWidth + this.currentPos.left * imgWidth / windowWidth;
      }
      if (isOutOfBoundsTop) {
        cropHeight = cropHeight + imgHeight * offsetHeightRatio;
      }

      const cropObj = {
        originX: Math.round(originX),
        originY: Math.round(originY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      };
      console.log('cropObj', cropObj);
    });
  }

  onHandleScroll = (event) => {
    this.scrollOffset = event.nativeEvent.contentOffset.y;
  }

  setCurrentPos(top = 0, left = 0) {
    this.currentPos.top = top;
    this.currentPos.left = left;
  }

  setAspect(aspect) {
    this.aspect = aspect;
  }


  handleChangePickerValue = (itemValue, itemIndex) => {
    const { photo } = this.props;
    const choosenMetricOfSquare = this.state.metrics.find((metric) => metric.id === itemValue);
    if (!choosenMetricOfSquare.fullSize) {
      // console.log('-----------choosenMetricOfSquare-------', choosenMetricOfSquare);
      this.setCurrentPos(choosenMetricOfSquare.top, choosenMetricOfSquare.left);
      this.setCurrentSizes(choosenMetricOfSquare.width, choosenMetricOfSquare.height);
      this.setAspect(choosenMetricOfSquare.aspect);
      const { cropWidth, cropHeight } = this.calculateMetricsOfSquareCrop(this.maxSizes.width, this.maxSizes.height);
      this.setMinSizes(cropWidth, cropHeight);
      this.setSizesForSquareCrop(
        cropWidth,
        cropHeight,
        choosenMetricOfSquare.top,
        choosenMetricOfSquare.left
      );
    } else {
      this.setCurrentPos();
      this.setCurrentSizes(this.maxSizes.width, this.maxSizes.height);
      this.aspect = [ photo.width, photo.height ];
      this.setSizesForSquareCrop(this.maxSizes.width, this.maxSizes.height);
    }

    this.setState({ selectedAspect: itemValue });
  }

  getLabelAspect = (aspect) => {
    return `${aspect[0]}:${aspect[1]}`;
  }

  renderPickerOptions = () => {
    return this.props.aspect.map((aspect, i) => {
      return <Picker.Item style={{ color: 'white' }} key={i + 'key'} label={this.getLabelAspect(aspect)} value={i + 1} />;
    });
  }

  calculateLeftCoordsOfSquare(left) {
    let leftSquare = left || 0;

    if (this.currentPos.left < 0) {
      leftSquare = 0;
    }

    if (this.currentPos.left > this.maxSizes.width - this.currentSize.width) {
      leftSquare = this.maxSizes.width - this.currentSize.width;
    }

    return leftSquare;
  }

  calculateTopCoordsOfSquare(top) {
    let topSquare = top || 0;

    if (this.currentPos.top < 0) {
      topSquare = 0;
    }

    if (this.currentPos.top > this.maxSizes.height - this.currentSize.height) {
      topSquare = this.maxSizes.height - this.currentSize.height;
    }

    return topSquare;
  }

  isValidAspect() {
    return this.aspect && this.aspect.length > 0 && this.aspect.every((itm) => Number.isInteger(itm));
  }

  renderButton = (title, action, icon) => {
    return (
      <HybridTouch onPress={action}>
        <View style={{ padding: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Icon size={20} name={icon} color="white" />
          <Text style={{ color: 'white', fontSize: 15, marginLeft: 5 }}>{title}</Text>
        </View>
      </HybridTouch>
    );
  }

  setSizesForSquareCrop(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, top = 0, left = 0) {
    if (this.square) {
      this.square.transitionTo(
        { width: width,
          height: height,
          top: top,
          left: left,
        },
        0,
      );
    }
  }

  setFullSizeMetrics = (eventNative) => {
    this.setCurrentSizes(eventNative.layout.width, eventNative.layout.height);
    this.setSizesForSquareCrop(eventNative.layout.width, eventNative.layout.height);
    this.forceUpdate();
  }

  render() {
    const { isVisible, translation } = this.props;
    const { uri } = this.state;

    if (!uri) {
      return null;
    }

    const { width, height } = this.currentSize;
    const { top, left } = this.currentPos;
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isVisible}
        hardwareAccelerated
        onRequestClose={() => {
          this.onToggleModal();
          console.log('Modal has been closed.');
        }}
      >
        <SafeAreaView
          style={{
            width: windowWidth, backgroundColor: 'black', flexDirection: 'row', justifyContent: 'space-between',
          }}
        >
          {this.renderButton('', this.onToggleModal, 'arrow-left')}

          <View
            style={{
              justifyContent: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {this.renderButton('', this.onCropImage, 'check')}
            <Icon size={20} name="menu-down" color="white" />
            {/* <Picker
              mode="dropdown"
              textStyle={{ color: 'white' }}
              itemTextStyle={{ color: 'black' }}
              headerTitleStyle={{ color: 'black' }}
              selectedValue={this.state.selectedAspect}
              style={{ height: 50, width: 'auto' }}
              onValueChange={this.handleChangePickerValue}
              placeholder={translation.placeholderPicker}
              placeholderStyle={{ color: 'white' }}
            > */}
            {/* {this.props.fullSize && <Picker.Item style={{ color: 'white' }} key={0 + 'key'} label="100%" value={0} />} */}
            {/* {this.renderPickerOptions()}
            </Picker> */}
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <ScrollView
            style={{ position: 'relative', flex: 1 }}
            maximumZoomScale={3}
            minimumZoomScale={0.5}
            onScroll={this.onHandleScroll}
            bounces={false}
            ref={(item) => {
              this.scrollView = item;
            }}
          >
            <AutoHeightImage
              style={{ backgroundColor: 'black' }}
              source={{ uri: uri }}
              resizeMode="contain"
              width={windowWidth}
              onLayout={(event) => {
                // console.log('-----AutoHeightImage-----', event);
                this.maxSizes.width = event.nativeEvent.layout.width || 100;
                this.maxSizes.height = event.nativeEvent.layout.height || 100;
                if (this.props.aspect.length === 1 && !this.props.metrics && this.props.aspect[0].length === 1) {
                  this.setFullSizeMetrics(event.nativeEvent);
                } else {
                  this.setMetricsOfSquareCrop(event.nativeEvent.layout.width, event.nativeEvent.layout.height);
                }
              }}
            />

            <Animatable.View
              onLayout={(event) => {
                // console.log('-----event----', event.nativeEvent.layout);
                this.currentSize.height = event.nativeEvent.layout.height;
                this.currentSize.width = event.nativeEvent.layout.width;
                this.currentPos.top = event.nativeEvent.layout.y;
                this.currentPos.left = event.nativeEvent.layout.x;
              }}
              ref={(ref) => {
                this.square = ref;
              }}
              {...this._panResponder.panHandlers}
              style={{
                borderRadius: 5,
                borderWidth: 3,
                borderColor: 'yellow',
                flex: 1,
                minHeight: this.minHeight,
                width: width,
                height: height,
                position: 'absolute',
                maxHeight: this.maxSizes.height,
                top: top || 0,
                left: left || 0,
                maxWidth: this.maxSizes.width,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    );
  }
}

export default ImgManipulator;


ImgManipulator.defaultProps = {
  onPictureChoosed: (uri) => console.log('URI:', uri),
  fullSize: false,
  defaultWidth: DEFAULT_WIDTH,
  defaultHeight: DEFAULT_HEIGHT,
  metrics: null,
  aspect: [],
  translation: {
    placeholderPicker: 'Select aspect'
  },
};

ImgManipulator.propTypes = {
  metrics: PropTypes.shape({
    top: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }),
  translation: PropTypes.shape({
    placeholderPicker: PropTypes.string,
  }),
  aspect: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  defaultWidth: PropTypes.number,
  defaultHeight: PropTypes.number,
  fullSize: PropTypes.bool,
  isVisible: PropTypes.bool.isRequired,
  onPictureChoosed: PropTypes.func,
  photo: PropTypes.shape({
    uri: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  onToggleModal: PropTypes.func.isRequired,
};
