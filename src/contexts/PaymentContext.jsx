import React, { createContext, useContext, useState } from 'react';
import { useMutation } from '@apollo/client';
import { message } from 'antd';
import { RECORD_CLIENT_PAYMENT } from '../gql/clientLedger';

const PaymentContext = createContext();

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
};

export const PaymentProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preSelectedClientId, setPreSelectedClientId] = useState(null);

  const [recordPayment, { loading: recordingPayment }] = useMutation(
    RECORD_CLIENT_PAYMENT,
    {
      onCompleted: (data) => {
        if (data.recordClientPayment.success) {
          message.success(data.recordClientPayment.message);
          setIsModalOpen(false);
          setPreSelectedClientId(null);
        } else {
          message.error(data.recordClientPayment.message);
        }
      },
      onError: (error) => {
        message.error(`Error recording payment: ${error.message}`);
      },
      refetchQueries: [
        'GetClientLedgerSummary',
        'GetClientPayments',
        'GetClientLedgerRange'
      ],
    }
  );

  const openPaymentModal = (clientId = null) => {
    setPreSelectedClientId(clientId);
    setIsModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsModalOpen(false);
    setPreSelectedClientId(null);
  };

  const handleRecordPayment = async (paymentInput) => {
    try {
      await recordPayment({
        variables: {
          input: paymentInput,
        },
      });
    } catch (error) {
      console.error('Payment recording error:', error);
    }
  };

  const value = {
    isModalOpen,
    preSelectedClientId,
    recordingPayment,
    openPaymentModal,
    closePaymentModal,
    handleRecordPayment,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};
