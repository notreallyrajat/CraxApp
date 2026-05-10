import React from 'react';
import ComingSoonScreen from '../../components/ComingSoonScreen';

const images = [
  require('../../assets/images/ai_1.png'),
  require('../../assets/images/ai_2.png'),
  require('../../assets/images/ai_3.png'),
  require('../../assets/images/ai_4.png'),
];

export default function TimetableModule() {
  return (
    <ComingSoonScreen 
      title="Smart Timetable Sync" 
      description="Experience intelligent scheduling that perfectly aligns your classes, lab sessions, and exam duties. Our AI ensures no overlaps and optimal teaching hours."
      images={images}
      featureName="ai_allotment"
    />
  );
}
