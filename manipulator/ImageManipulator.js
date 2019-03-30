import React, { Component } from 'react';
import {
  PanResponder, Dimensions, ScrollView, Modal, View, Text, SafeAreaView, Platform, Image
} from 'react-native';
import { Picker } from 'native-base';
import * as Animatable from 'react-native-animatable';
import PropTypes from 'prop-types';
import AutoHeightImage from 'react-native-auto-height-image';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RNPickerSelect from 'react-native-picker-select';
import HybridTouch from '../HybridTouch';

import getDefaultCrop from './utils';

const windowWidth = Dimensions.get('window').width;


const heightTopBar = 80;

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 100;

class ImgManipulator extends Component {
  constructor(props) {
    super(props);
    const { photo, aspect, metrics } = this.props;
    const squareMetrics = this.getDefaultSquareMetrics(metrics);
    this.state = {
      uri: photo.uri,
      selectedAspect: null,
      androidItems: this.prepareItems(aspect),
      isShow: false
    };
    // refs crop and image inside of crop square
    this.brightImage = null;
    this.square = null;

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

    this.minHeight = 10;
    this.minWidth = 10;

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
        const { moveX, moveY, x0 } = gestureState;
        const moveXRound = Math.round(moveX);
        const moveYRound = Math.round(moveY);
        const x0Round = Math.round(x0);

        if (!this.isResizing && x0Round < this.currentPos.left + this.currentSize.width * 0.9) {
          const left = moveXRound - this.currentSize.width / 2;
          const top = moveYRound + this.scrollOffset - this.currentSize.height / 2 - 85;

          this.square.setNativeProps(
            {
              left: this.calculateLeftCoordsOfSquare(left, moveXRound),
              top: this.calculateTopCoordsOfSquare(top, moveYRound), /**  OFFSET */
            },
            0,
          );

          this.setPositionForBrightImage(this.currentPos.top, this.currentPos.left);

        } else {
          this.isResizing = true;
          let aspect = null;
          const squareWidth = moveXRound - this.currentPos.left;
          let squareHeight = moveYRound - this.currentPos.top + this.scrollOffset - 45; /** OFFSET */

          if (this.isValidAspect()) {
            aspect = this.aspect[0] / this.aspect[1];
            squareHeight = squareWidth / aspect;
          }

          const baseWidth = this.minWidth || DEFAULT_WIDTH;
          const baseHeight = this.minHeight || DEFAULT_HEIGHT;

          this.square.setNativeProps(
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

  setPositionForBrightImage(top, left) {
    this.brightImage.setNativeProps({
      transform: [{translateY: top * -1}, {translateX: left * -1}]
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

  get cropInViewArea() {
    const lessThanRightEdge = this.currentPos.left <= this.maxSizes.width - this.currentSize.width;
    const moreThanLeftEdge = this.currentPos.left >= 0;
    const lessThanBottomEdge = this.currentPos.top <= this.maxSizes.height - this.currentSize.height;
    const moreThanTopEdge = this.currentPos.top >= 0;
    return lessThanRightEdge && moreThanLeftEdge && lessThanBottomEdge && moreThanTopEdge;
  }

  onCropImage = () => {
    if (this.cropInViewArea) {
      const imgWidth = this.props.photo.width;
      const imgHeight = this.props.photo.height;

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
    } else {
      this.setSizesForSquareCrop();
    }
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

  calculateNewCropInAccordingToNewAspect(cropWidth) {
    const aspect = this.aspect[0] / this.aspect[1];
    const height = cropWidth / aspect;
    return height;
  }


  handleChangePickerValue = (itemValue, itemIndex) => {
    const { photo } = this.props;
    const choosenAspect = this.props.aspect.find((metric, index) => index === itemValue);

    if (itemValue !== null) {
      if (choosenAspect.length > 1) {
        this.setCurrentPos(0, 0);
        this.setAspect(choosenAspect);
        const { width, height } = getDefaultCrop(this.maxSizes.width, this.maxSizes.height, choosenAspect[0], choosenAspect[1]);
        this.setCurrentSizes(width, height);

        this.setSizesForSquareCrop(
          this.currentSize.width,
          this.currentSize.height,
          this.currentPos.top,
          this.currentPos.left
        );
      } else {
        this.setCurrentPos();
        this.setCurrentSizes(this.maxSizes.width, this.maxSizes.height);
        this.aspect = [ photo.width, photo.height ];
        this.setSizesForSquareCrop(this.maxSizes.width, this.maxSizes.height);
      }
    }

    this.setState({ selectedAspect: itemValue });
  }

  getLabelAspect = (aspect) => {
    return aspect.length > 1 ? `${aspect[0]}:${aspect[1]}` : `${aspect[0]}%`;
  }

  renderPickerOptions = () => {
    return this.props.aspect.map((aspect, index) => {
      return <Picker.Item style={{ color: 'white' }} key={index + 'key'} label={this.getLabelAspect(aspect)} value={index} />;
    });
  }

  calculateLeftCoordsOfSquare(left, moveX) {
    let leftSquare = left || 0;

    if (this.currentPos.left < 0 
      || moveX < 0 + this.currentSize.width * 0.5
      ) {
      leftSquare = 0;
    }

    if (
      (this.currentPos.left > this.maxSizes.width - this.currentSize.width)
      || (moveX > this.maxSizes.width - this.currentSize.width * 0.5)
    ) {
      leftSquare = this.maxSizes.width - this.currentSize.width;
    }

    return leftSquare;
  }

  calculateTopCoordsOfSquare(top, moveY) {
    let topSquare = top || 0;
    const moveYCustom = moveY - heightTopBar;
    if (
      this.currentPos.top < 0 
      || moveYCustom < 0 + this.currentSize.height * 0.6
    ) {
      topSquare = 0;
    }

    if (
      (this.currentPos.top > this.maxSizes.height - this.currentSize.height)
      || (moveYCustom > this.maxSizes.height - this.currentSize.height * 0.6)
    ) {
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

  setSizesForSquareCrop(width = this.currentSize.width, height = this.currentSize.height, top = 0, left = 0) {
    if (this.square) {
      this.square.setNativeProps(
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

  prepareItems = () => {
    return this.props.aspect.map((itm, index) => ({ label: this.getLabelAspect(itm), value: index }));
  }

  calcWidth(percent) {
    return Math.round(percent * windowWidth / 100);
  }

  createPicker() {
    const { aspect, translation } = this.props;

    const placeholder = {
      label: translation.placeholderPicker,
      value: null,
      color: 'black',
    };

    return aspect.length > 1 && (
      Platform.OS === 'android' ? (
        <RNPickerSelect
          placeholder={placeholder}
          items={this.state.androidItems}
          value={this.state.selectedAspect}
          onValueChange={this.handleChangePickerValue}
          useNativeAndroidPickerStyle={false}
          style={{
            inputAndroid: {
              color: 'white'
            },
            inputAndroidContainer: {
              minWidth: 100
            }
          }}
        />
      )
        : (
          <Picker
            mode="dropdown"
            textStyle={{ color: 'white' }}
            itemTextStyle={{ color: 'black' }}
            headerTitleStyle={{ color: 'black' }}
            selectedValue={this.state.selectedAspect}
            style={{
              height: 50,
              width: this.calcWidth(53),
              alignSelf: 'center',
            }}
            onValueChange={this.handleChangePickerValue}
            placeholder={translation.placeholderPicker}
            placeholderStyle={{ color: 'white' }}
          >
            {this.renderPickerOptions()}
          </Picker>
        )
    );
  }

  showCropper = () => {
    this.setState({
      isShow: true
    });
  }

  render() {
    const { isVisible } = this.props;
    const { uri } = this.state;

    if (!uri) {
      return null;
    }

    const { width, height } = this.currentSize;
    const { top, left } = this.currentPos;
    const Picker = this.createPicker();
    const borderColor = this.state.isShow ? 'yellow' : 'transparent';
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
            width: windowWidth,
            backgroundColor: 'black',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 90
          }}
        >
          {this.renderButton('', this.onToggleModal, 'arrow-left')}

          <View
            style={{
              justifyContent: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              alignContent: 'center',
            }}
          >
            {this.props.aspect.length > 1 && <Icon size={20} name="menu-down" color="white" /> }
            {Picker}
          </View>
          {this.renderButton('', this.onCropImage, 'check')}
        </SafeAreaView>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <ScrollView
            style={{ position: 'relative', flex: 1 }}
            maximumZoomScale={1}
            minimumZoomScale={1}
            onScroll={this.onHandleScroll}
            bounces={false}
            ref={(item) => {
              this.scrollView = item;
            }}
          >
            <View style={{ position: 'relative' }}>
              <AutoHeightImage
                style={{ position: 'relative', backgroundColor: 'black' }}
                source={{ 
                  uri: uri,
                  headers: {
                    'cache-control': 'public'
                  }
                }}
                resizeMode="contain"
                width={windowWidth}
                onLayout={(event) => {
                  this.maxSizes.width = event.nativeEvent.layout.width || 100;
                  this.maxSizes.height = event.nativeEvent.layout.height || 100;
                  if (this.props.aspect.length > 0 && !this.props.metrics && this.props.aspect[0].length === 1) {
                    this.setFullSizeMetrics(event.nativeEvent);
                  } else {
                    this.setMetricsOfSquareCrop(event.nativeEvent.layout.width, event.nativeEvent.layout.height);
                  }
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: this.maxSizes.width,
                  height: this.maxSizes.height,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)'
                }}
              />
              {/* {this.state.isShow && ( */}
              <View
                onLayout={(event) => {
                  this.currentSize.height = Math.round(event.nativeEvent.layout.height);
                  this.currentSize.width = Math.round(event.nativeEvent.layout.width);
                  this.currentPos.top = Math.round(event.nativeEvent.layout.y);
                  this.currentPos.left = Math.round(event.nativeEvent.layout.x);
                }}
                ref={(ref) => {
                  this.square = ref;
                }}
                {...this._panResponder.panHandlers}
                style={{
                  overflow: 'hidden',
                  borderRadius: 5,
                  borderWidth: 3,
                  borderColor: borderColor,
                  flex: 1,
                  minHeight: this.minHeight,
                  width: width,
                  height: height,
                  position: 'absolute',
                  maxHeight: this.maxSizes.height,
                  top: top || 0,
                  left: left || 0,
                  zIndex: 5,
                  maxWidth: this.maxSizes.width,
                  backgroundColor: 'opacity',
                }}
              >
              <Image
                onLoad={this.showCropper}
                source={{ uri: uri }}
                ref={(ref) => {
                  this.brightImage = ref;
                }}
                style={{
                  width: windowWidth,
                  height: this.maxSizes.height,
                  transform: [{translateY: this.currentPos.top * -1}, {translateX: this.currentPos.left * -1}],
                }}
                /> 
              </View>
              {/* )} */}
            </View>

          </ScrollView>
        </View>
      </Modal>
    );
  }
}

export default ImgManipulator;


ImgManipulator.defaultProps = {
  onPictureChoosed: (uri) => console.log('URI:', uri),
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
  isVisible: PropTypes.bool.isRequired,
  onPictureChoosed: PropTypes.func,
  photo: PropTypes.shape({
    uri: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  onToggleModal: PropTypes.func.isRequired,
};
