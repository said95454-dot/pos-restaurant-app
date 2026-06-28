import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const PM = { cash: 'EFECTIVO', card: 'TARJETA', transfer: 'TRANSFERENCIA' };

/** Build the URL printed as QR. Includes ref for tracking which order generated the scan. */
const buildQrUrl = (baseUrl, orderId) => {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    if (orderId) url.searchParams.set('ref', orderId.slice(0, 8));
    return url.toString();
  } catch {
    // Not a valid URL — return as-is (could be plain text the user wants encoded)
    return baseUrl;
  }
};

/**
 * Printable receipt rendered hidden in the DOM.
 * Compatible with ANY printer via the OS print dialog (window.print()):
 * - AirPrint (iOS/macOS), Bluetooth, USB, Network, Thermal printers
 * - Page set to 80mm (thermal) but works on A4/Letter too.
 */
const Receipt = React.forwardRef(({ order, business, restaurant }, ref) => {
  if (!order) return null;
  const date = new Date(order.created_at || Date.now());
  const qrUrl = buildQrUrl(business?.qr_url, order.id);
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
      {(order.tip || 0) > 0 && (
        <>
          <div className="print-row print-small">
            <span>Subtotal:</span>
            <span>{formatMoney(order.subtotal ?? (order.total - (order.tip || 0)))}</span>
          </div>
          <div className="print-row print-small print-bold">
            <span>Propina:</span>
            <span>{formatMoney(order.tip)}</span>
          </div>
        </>
      )}
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
      {qrUrl && (
        <div className="print-center" style={{ marginTop: 8, marginBottom: 4 }}>
          {business?.qr_label && (
            <div className="print-bold print-small" style={{ marginBottom: 4 }}>{business.qr_label}</div>
          )}
          <div style={{ display: 'inline-block', padding: 4, background: '#fff' }}>
            <QRCodeCanvas value={qrUrl} size={128} level="M" includeMargin={false} />
          </div>
          <div className="print-small" style={{ marginTop: 4 }}>Escanea con tu celular</div>
        </div>
      )}
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
  setTimeout(() => window.print(), 80);
};

export default Receipt;
