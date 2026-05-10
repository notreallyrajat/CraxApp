import React from 'react';
import ComingSoonScreen from '../../components/ComingSoonScreen';

const images = [
  require('../../assets/images/fee_1.png'),
  require('../../assets/images/fee_2.png'),
  require('../../assets/images/fee_3.png'),
  require('../../assets/images/fee_4.png'),
];

export default function FeeGatewayModule() {
  return (
    <ComingSoonScreen 
      title="Smart Fee Gateway" 
      description="Secure, paperless online fee payments with instant receipts. Manage tuition, transport, and exam fees through integrated digital wallets and global payment cards."
      images={images}
      featureName="fee_gateway"
    />
  );
}
