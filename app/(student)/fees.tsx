import React from 'react';
import ComingSoonScreen from '../../components/ComingSoonScreen';

const images = [
  require('../../assets/images/fee_1.png'),
  require('../../assets/images/fee_2.png'),
  require('../../assets/images/fee_3.png'),
  require('../../assets/images/fee_4.png'),
];

export default function FeeModule() {
  return (
    <ComingSoonScreen 
      title="Pay Fees Online" 
      description="Pay your school fees instantly using your favorite digital wallet or card. No more queues—get your receipts digitally and track your payment history."
      images={images}
      featureName="fee_gateway"
    />
  );
}
