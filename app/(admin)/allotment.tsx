import React from 'react';
import ComingSoonScreen from '../../components/ComingSoonScreen';

const images = [
  require('../../assets/images/ai_1.png'),
  require('../../assets/images/ai_2.png'),
  require('../../assets/images/ai_3.png'),
  require('../../assets/images/ai_4.png'),
];

export default function AIAllotmentModule() {
  return (
    <ComingSoonScreen 
      title="Intelligent AI Allotment" 
      description="Automated orchestration of class timetables, laboratory slots, and exam classroom allocations. Powered by advanced AI to optimize campus resources effortlessly."
      images={images}
      featureName="ai_allotment"
    />
  );
}
