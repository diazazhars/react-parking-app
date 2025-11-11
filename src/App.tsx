import React, { useEffect, useMemo, useState, useRef } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";

interface Slot {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
  size: "large" | "normal";
}

interface Booking {
  id: string;
  slotId: string;
  name: string;
  plate: string;
  start: number;
  durationMs: number;
}

const STORAGE_KEY_SLOTS = "parking_slots_v1";
const STORAGE_KEY_BOOKINGS = "parking_bookings_v1";

function makeDefaultSlots(rows = 4, cols = 6): Slot[] {
  const slots: Slot[] = [];
  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        id: `P${id}`,
        row: r,
        col: c,
        width: 90,
        height: 150,
        size: Math.random() > 0.8 ? "large" : "normal",
      });
      id++;
    }
  }
  return slots;
}

export default function ParkingApp() {
  const [slots] = useState<Slot[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    return raw ? JSON.parse(raw) : makeDefaultSlots(4, 6);
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    return raw ? JSON.parse(raw) : [];
  });

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // ✅ Browser-friendly type
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setBookings((b) => [...b]);
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const slotStatus = useMemo(() => {
    const status: Record<string, Booking> = {};
    bookings.forEach((bk) => (status[bk.slotId] = bk));
    return status;
  }, [bookings]);

  function openBooking(slot: Slot) {
    setSelectedSlot(slot);
    setShowForm(true);
  }

  function handleBook({ name, plate, durationHours }: { name: string; plate: string; durationHours: number }) {
    if (!selectedSlot) return;
    const now = Date.now();
    const booking: Booking = {
      id: `B${now}`,
      slotId: selectedSlot.id,
      name,
      plate,
      start: now,
      durationMs: durationHours * 60 * 60 * 1000,
    };
    setBookings((b) => [...b, booking]);
    setShowForm(false);
    setSelectedSlot(null);
  }

  function endSession(id: string) {
    if (!confirm("Akhiri sesi parkir ini?")) return;
    setBookings((b) => b.filter((x) => x.id !== id));
    if (detailBooking?.id === id) setDetailBooking(null);
  }

  function formatMs(ms: number) {
    const s = Math.abs(Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }

  const filteredSlots = slots.filter((s) => {
    const b = slotStatus[s.id];
    const q = query.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      b?.plate?.toLowerCase().includes(q) ||
      b?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-800">🚗 Sistem Parkir Modern</h1>

        <input
          className="w-full md:w-80 px-4 py-2 border rounded-xl"
          placeholder="Cari slot, plat, nama..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <div className="flex flex-col md:flex-row gap-6 mt-6">

        <div className="rounded-xl shadow-lg bg-gray-100 p-4 overflow-auto">
          <Stage width={800} height={770}>
            <Layer>
              <Rect x={0} y={0} width={800} height={600} fill="#e5e7eb" />

              {filteredSlots.map((slot) => {
                const x = slot.col * 120 + 20;
                const y = slot.row * 180 + 20;
                const bk = slotStatus[slot.id];
                const fillColor = bk ? "#ef4444" : "#22c55e";
                return (
                  <Group key={slot.id} x={x} y={y}>
                    <Rect
                      width={slot.width}
                      height={slot.height}
                      cornerRadius={12}
                      fill={fillColor}
                      stroke="#000"
                      strokeWidth={3}
                      onClick={() => (bk ? setDetailBooking(bk) : openBooking(slot))}
                    />
                    <Text text={slot.id} y={slot.height + 6} fontSize={16} />
                    {bk && <Text text={bk.plate} fontSize={14} y={slot.height - 26} x={8} fill="white" />}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>

        <div className="w-full md:w-64 space-y-3">
          {bookings.map((bk) => {
            const remaining = bk.start + bk.durationMs - Date.now();
            const overtime = remaining < 0;
            return (
              <div key={bk.id} className="p-4 bg-white rounded-xl shadow">
                <div className="font-bold">{bk.slotId}</div>
                <div>{bk.name}</div>
                <div className={overtime ? "text-red-600" : "text-green-600"}>
                  {overtime ? `Overtime ${formatMs(remaining)}` : `Sisa ${formatMs(remaining)}`}
                </div>
                <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded" onClick={() => setDetailBooking(bk)}>
                  Detail
                </button>
                <button className="mt-2 ml-2 px-3 py-1 bg-red-500 text-white rounded" onClick={() => endSession(bk.id)}>
                  Akhiri
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && selectedSlot && (
        <Modal>
          <BookingForm slotId={selectedSlot.id} onCancel={() => setShowForm(false)} onSubmit={handleBook} />
        </Modal>
      )}

      {detailBooking && (
        <Modal>
          <DetailCard booking={detailBooking} formatMs={formatMs} endSession={endSession} onClose={() => setDetailBooking(null)} />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">{children}</div>
    </div>
  );
}

function BookingForm({
  slotId,
  onCancel,
  onSubmit,
}: {
  slotId: string;
  onCancel: () => void;
  onSubmit: (data: { name: string; plate: string; durationHours: number }) => void;
}) {
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [durationHours, setDurationHours] = useState(1);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, plate, durationHours });
      }}
      className="space-y-3"
    >
      <h4 className="font-semibold text-lg">Pesan Slot {slotId}</h4>

      <input className="border p-2 w-full" placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="border p-2 w-full" placeholder="Nomor Kendaraan" value={plate} onChange={(e) => setPlate(e.target.value)} />
      <input type="number" className="border p-2 w-full" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">
          Batal
        </button>
        <button className="px-3 py-1 bg-green-600 text-white rounded">Pesan</button>
      </div>
    </form>
  );
}

function DetailCard({
  booking,
  formatMs,
  endSession,
  onClose,
}: {
  booking: Booking;
  formatMs: (ms: number) => string;
  endSession: (id: string) => void;
  onClose: () => void;
}) {
  const remaining = booking.start + booking.durationMs - Date.now();
  const overtime = remaining < 0;

  return (
    <div className="space-y-2">
      <h4 className="text-xl font-semibold">Detail Pemesanan</h4>
      <div><strong>Nama:</strong> {booking.name}</div>
      <div><strong>Plat:</strong> {booking.plate}</div>
      <div><strong>Slot:</strong> {booking.slotId}</div>

      <div className={overtime ? "text-red-600" : "text-green-600"}>
        {overtime ? `Overtime ${formatMs(remaining)}` : `Sisa ${formatMs(remaining)}`}
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <button onClick={() => endSession(booking.id)} className="px-3 py-1 bg-red-600 text-white rounded">Akhiri</button>
        <button onClick={onClose} className="px-3 py-1 border rounded">Tutup</button>
      </div>
    </div>
  );
}
