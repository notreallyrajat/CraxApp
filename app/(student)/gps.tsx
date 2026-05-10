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
      title="Track My Bus" 
      description="View your school bus live on the map. Get real-time notifications when the bus is near your stop and track the exact coordinates of your ride home."
      images={images}
      featureName="gps_tracking"
    />
  );
}
