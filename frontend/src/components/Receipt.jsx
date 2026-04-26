import React from 'react';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const PM = { cash: 'EFECTIVO', card: 'TARJETA', transfer: 'TRANSFERENCIA' };

/**
 * Printable receipt rendered hidden in the DOM.
 * Compatible with ANY printer via the OS print dialog (window.print()):
 * - AirPrint (iOS/macOS)
 * - Bluetooth thermal printers (paired at OS level)
 * - USB / Network thermal printers
 * - Standard A4/Letter printers
 *
 * Page is set to 80mm (thermal) but works fine on any paper size.
 */
const Receipt = React.forwardRef(({ order, business, restaurant }, ref) => {
  if (!order) return null;
  const date = new Date(order.created_at || Date.now());
  return (
    <div ref={ref} className="print-area" style={{ position: 'fixed', left: '-10000px', top: 0, width: '80mm' }}>
      <div className="print-center print-bold print-large">{business?.name || restaurant?.restaurant_name || 'Restaurante'}</div>
      {business?.logo && (
        <div className="print-center" style={{ margin: '4px 0' }}>
          <img src={business.logo} alt="" style={{ maxWidth: '60mm', maxHeight: '20mm', objectFit: 'contain' }} />
        </div>
      )}
      <div className="print-center print-small">{date.toLocaleString('es-MX')}</div>
      <div className="print-center print-small">Folio: {order.id?.slice(0, 8).toUpperCase()}</div>
      <div className="print-divider" />
      <div className="print-row print-small">
        <span className="print-bold">Cliente:</span>
        <span>{order.customer_name}</span>
      </div>
      {order.cashier_name && (
        <div className="print-row print-small">
          <span className="print-bold">Cajero:</span>
          <span>{order.cashier_name}</span>
        </div>
      )}
      <div className="print-divider" />
      <div className="print-bold print-small" style={{ marginBottom: 4 }}>PRODUCTOS</div>
      {order.items?.map((it, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div className="print-row">
            <span className="print-bold">{it.quantity}x {it.product_name}</span>
            <span>{formatMoney(it.subtotal)}</span>
          </div>
          {it.selected_options?.length > 0 && (
            <div className="print-small" style={{ paddingLeft: 8 }}>+ {it.selected_options.join(', ')}</div>
          )}
          <div className="print-small" style={{ paddingLeft: 8 }}>
            ({formatMoney(it.product_price)} c/u)
          </div>
        </div>
      ))}
      <div className="print-divider" />
      <div className="print-row print-large print-bold">
        <span>TOTAL</span>
        <span>{formatMoney(order.total)}</span>
      </div>
      <div className="print-row print-small" style={{ marginTop: 4 }}>
        <span>Pago:</span>
        <span className="print-bold">{PM[order.payment_method] || order.payment_method}</span>
      </div>
      {order.payment_method === 'cash' && order.amount_received != null && (
        <>
          <div className="print-row print-small">
            <span>Recibido:</span>
            <span>{formatMoney(order.amount_received)}</span>
          </div>
          <div className="print-row print-small print-bold">
            <span>Cambio:</span>
            <span>{formatMoney(order.change)}</span>
          </div>
        </>
      )}
      <div className="print-divider" />
      <div className="print-center print-small" style={{ marginTop: 8 }}>¡Gracias por su visita!</div>
      <div className="print-center print-small">Vuelva pronto</div>
      <div style={{ height: 30 }} />
    </div>
  );
});

Receipt.displayName = 'Receipt';

/** Trigger printing of an order. Uses native window.print() so it works with
 * AirPrint, Bluetooth, USB, network and thermal printers via the OS dialog. */
export const printOrder = () => {
  // Small delay to let React render the print-area before printing
  setTimeout(() => window.print(), 80);
};

export default Receipt;
