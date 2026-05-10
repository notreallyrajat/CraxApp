import React from 'react';
import ComingSoonScreen from '../../components/ComingSoonScreen';

const images = [
  require('../../assets/images/gps_1.png'),
  require('../../assets/images/gps_2.png'),
  require('../../assets/images/gps_3.png'),
  require('../../assets/images/gps_4.png'),
];

export default function GPSModule() {
  return (
    <ComingSoonScreen 
      title="Live Bus GPS Tracker" 
      description="Real-time coordinates and live route tracking for all campus transport. Get instant ETA and location alerts just like your favorite booking apps."
      images={images}
      featureName="gps_tracking"
    />
  );
}
