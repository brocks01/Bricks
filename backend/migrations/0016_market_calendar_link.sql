-- A booking that is accepted puts one calendar item in each person's calendar; cancelling the booking cancels them.
alter table calendar_items add column booking_id uuid references service_bookings(id) on delete set null;
create index calendar_items_booking on calendar_items (booking_id) where booking_id is not null;
