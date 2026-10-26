jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: ({ onBarCodeScanned }) => null,
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}));

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  return (props) => React.createElement('QRCode', props);
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const Mock = (props) => React.createElement('Svg', props, props.children);
  return { __esModule: true, default: Mock, Svg: Mock, Path: (p) => React.createElement('Path', p), Circle: (p) => React.createElement('Circle', p), G: (p) => React.createElement('G', p), Rect: (p) => React.createElement('Rect', p) };
});
