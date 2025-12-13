import React from 'react';

const ProjectFormFooter = ({ totalImageQuantity, totalCalculatedBudget, shouldHidePrices = false }) => {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: '500', color: '#595959' }}>Total Images:</span>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
          {totalImageQuantity > 0 ? totalImageQuantity.toLocaleString() : '0'}
        </span>
      </div>
      {!shouldHidePrices && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '500', color: '#595959' }}>Estimated Cost:</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
            ₹{totalCalculatedBudget?.toLocaleString() || '0'}
          </span>
        </div>
      )}
    </>
  );
};

export default ProjectFormFooter;
