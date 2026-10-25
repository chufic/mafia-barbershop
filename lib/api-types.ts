/** Общие типы ответов API — используются и на сервере, и в клиентских компонентах. */

export type SlotDto = { time: string; startsAt: string; endsAt: string };

export type MasterAvailabilityDto = {
  id: string;
  name: string;
  isWorking: boolean;
  slots: SlotDto[];
};

export type MergedSlotDto = SlotDto & { masterIds: string[] };

export type NearestSlotDto = {
  date: string;
  time: string;
  startsAt: string;
  masterId: string;
  masterName: string;
};

export type SlotsResponse = {
  date: string;
  durationMin: number;
  masterId: string;
  masters: MasterAvailabilityDto[];
  slots: MergedSlotDto[];
  nearest: NearestSlotDto[];
};

export type BookingServiceDto = {
  id: string;
  name: string;
  price: number;
  durationMin: number;
};

export type BookingDto = {
  publicId: string;
  name: string;
  phone: string;
  comment: string | null;
  masterId: string;
  masterName: string;
  startsAt: string;
  endsAt: string;
  date: string;
  time: string;
  endTime: string;
  durationMin: number;
  services: BookingServiceDto[];
  totalPrice: number;
  status: "new" | "cancelled" | "done";
  createdAt: string;
  canCancel: boolean;
};

export type BookingsListResponse = { bookings: BookingDto[] };

export type CreateBookingResponse = {
  booking: BookingDto;
  duplicate: boolean;
  telegramSent: boolean;
};

export type CancelBookingResponse = { booking: BookingDto };

export type ApiErrorResponse = {
  error: string;
  errors?: Record<string, string>;
  code?: string;
};
