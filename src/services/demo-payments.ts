export type DemoMethod = 'gcash' | 'maya' | 'card';
export type DemoOutcome = 'success' | 'failed' | 'cancelled';
export type DemoBooking = { id: string; client_id: string; total_centavos: number; status: string; scheduled_pickup_at?: string | null; pickup_date: string };
export type DemoReceipt = { demo: true; reference: string; bookingId: string; clientId: string; amount: number; method: DemoMethod; outcome: DemoOutcome; recordedAt: string };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
const key = (booking: DemoBooking) => `motorrent:demo-payment:v1:${booking.client_id}:${booking.id}`;
export function demoCanPay(booking: DemoBooking, now: number) {
  return booking.status === 'approved' && Number.isSafeInteger(booking.total_centavos) && booking.total_centavos > 0 && Date.parse(booking.scheduled_pickup_at || `${booking.pickup_date}T00:00:00+08:00`) > now;
}
export function createDemoPaymentService(storage: Storage, now = () => Date.now()) {
  return {
    async load(booking: DemoBooking): Promise<DemoReceipt | null> {
      const value = await storage.getItem(key(booking));
      if (!value) return null;
      try {
        const row = JSON.parse(value) as DemoReceipt;
        if (row.demo !== true || row.bookingId !== booking.id || row.clientId !== booking.client_id || row.amount !== booking.total_centavos || !['gcash', 'maya', 'card'].includes(row.method) || !['success', 'failed', 'cancelled'].includes(row.outcome) || typeof row.reference !== 'string' || !row.reference.startsWith('DEMO-') || !Number.isFinite(Date.parse(row.recordedAt))) return null;
        return row;
      } catch { return null; }
    },
    async simulate(booking: DemoBooking, method: DemoMethod, outcome: DemoOutcome): Promise<DemoReceipt> {
      const timestamp = now();
      if (!demoCanPay(booking, timestamp)) throw new Error('The demo checkout is available for approved bookings before pickup.');
      if (!['gcash', 'maya', 'card'].includes(method) || !['success', 'failed', 'cancelled'].includes(outcome)) throw new Error('Choose a valid demo result.');
      const row: DemoReceipt = { demo: true, reference: `DEMO-${timestamp.toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, bookingId: booking.id, clientId: booking.client_id, amount: booking.total_centavos, method, outcome, recordedAt: new Date(timestamp).toISOString() };
      await storage.setItem(key(booking), JSON.stringify(row));
      return row;
    },
    async reset(booking: DemoBooking) { await storage.removeItem(key(booking)); },
  };
}
