\set ON_ERROR_STOP on
insert into auth.users(id,raw_user_meta_data) values('20000000-0000-0000-0000-000000000001','{"full_name":"Concurrent Payer"}');
insert into public.motors(id,name,type,description,daily_rate_centavos)values('20000000-0000-0000-0000-000000000002','Concurrent Motor','Scooter','Fixture',150000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
values('20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Concurrent Motor',current_date+7,current_date+8,150000,'approved',now()+interval '7 days',now()+interval '8 days',20000);
