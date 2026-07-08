-- =====================================================================
-- Hospital Management System - Dialysis Management Dummy Data
-- =====================================================================
-- Run this script to populate the database with realistic data for 
-- the Dialysis Management dashboard (Machines, Sessions, Analytics).
-- Command to run inside docker:
-- docker exec -i hms-mysql mysql -u root -p'my_secure_password' hms < fix_dialysis_data.sql
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insert Dialysis Machines (8 total, 6 active, 1 maintenance, 1 out of order)
INSERT IGNORE INTO dialysis_machine (machine_id, machine_name, model, manufacturer, location, status, installation_date, last_maintenance, next_maintenance, maintenance_interval_days, total_hours_used, notes, created_at, updated_at) VALUES
('MCH-001', 'Fresenius 4008S - Unit 1', '4008S', 'Fresenius Medical Care', 'Dialysis Ward - Bed 1', 'ACTIVE', '2020-01-15', CURDATE() - INTERVAL 15 DAY, CURDATE() + INTERVAL 75 DAY, 90, 5200, 'Regular maintenance required soon', NOW(), NOW()),
('MCH-002', 'Fresenius 4008S - Unit 2', '4008S', 'Fresenius Medical Care', 'Dialysis Ward - Bed 2', 'ACTIVE', '2020-01-15', CURDATE() - INTERVAL 45 DAY, CURDATE() + INTERVAL 45 DAY, 90, 4800, 'Working optimally', NOW(), NOW()),
('MCH-003', 'B.Braun Dialog+ - Unit 3', 'Dialog+', 'B. Braun', 'Dialysis Ward - Bed 3', 'ACTIVE', '2021-03-20', CURDATE() - INTERVAL 30 DAY, CURDATE() + INTERVAL 60 DAY, 90, 3100, '', NOW(), NOW()),
('MCH-004', 'Fresenius 5008S - Unit 4', '5008S', 'Fresenius Medical Care', 'Dialysis Ward - Bed 4', 'ACTIVE', '2022-11-10', CURDATE() - INTERVAL 60 DAY, CURDATE() + INTERVAL 30 DAY, 90, 1500, 'Newest model', NOW(), NOW()),
('MCH-005', 'Gambro Phoenix - Unit 5', 'Phoenix', 'Gambro', 'Dialysis Ward - Bed 5', 'MAINTENANCE', '2019-05-12', CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 85 DAY, 90, 6200, 'Filter replacement in progress', NOW(), NOW()),
('MCH-006', 'Fresenius 4008S - Unit 6', '4008S', 'Fresenius Medical Care', 'Dialysis Ward - Bed 6', 'ACTIVE', '2020-06-18', CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 80 DAY, 90, 4100, '', NOW(), NOW()),
('MCH-007', 'B.Braun Dialog+ - Unit 7', 'Dialog+', 'B. Braun', 'Dialysis Ward - Bed 7', 'OUT_OF_ORDER', '2021-03-20', CURDATE() - INTERVAL 100 DAY, CURDATE() - INTERVAL 10 DAY, 90, 3800, 'Awaiting spare parts from Germany', NOW(), NOW()),
('MCH-008', 'Fresenius 5008S - Unit 8', '5008S', 'Fresenius Medical Care', 'Dialysis Ward - Bed 8', 'ACTIVE', '2022-11-10', CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 70 DAY, 90, 1800, 'High efficiency mode enabled', NOW(), NOW());

-- 2. Insert Dialysis Sessions
-- Let's add some past sessions for trend analysis (last 30 days)
INSERT IGNORE INTO dialysis_session (session_id, patient_national_id, patient_name, machine_id, scheduled_date, start_time, end_time, actual_start_time, actual_end_time, duration, status, attendance, session_type, pre_weight, post_weight, fluid_removal, pre_blood_pressure, post_blood_pressure, pre_heart_rate, post_heart_rate, temperature, patient_comfort, dialysis_access, blood_flow, dialysate_flow, created_at, updated_at) VALUES
('DS-100', '851234567V', 'Kamal Perera', 'MCH-001', CURDATE() - INTERVAL 2 DAY, '08:00:00', '12:00:00', '08:15:00', '12:15:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '65.2', '62.1', '3.1', '140/90', '120/80', 82, 76, 36.6, 'Comfortable', 'AV_FISTULA', 300, 500, NOW(), NOW()),
('DS-101', '921234567V', 'Saman Kumara', 'MCH-002', CURDATE() - INTERVAL 5 DAY, '13:00:00', '17:00:00', '13:05:00', '17:05:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '72.5', '69.8', '2.7', '135/85', '118/78', 78, 72, 36.7, 'Slight cramping', 'AV_FISTULA', 350, 500, NOW(), NOW()),
('DS-102', '781234567V', 'Nimal Silva', 'MCH-003', CURDATE() - INTERVAL 10 DAY, '09:00:00', '13:00:00', '09:10:00', '13:10:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '58.4', '56.2', '2.2', '120/80', '110/70', 70, 68, 36.5, 'Comfortable', 'CENTRAL_CATHETER', 250, 500, NOW(), NOW()),
('DS-103', '851234567V', 'Kamal Perera', 'MCH-004', CURDATE() - INTERVAL 15 DAY, '08:00:00', '12:00:00', '08:00:00', '12:00:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '64.8', '61.9', '2.9', '145/95', '125/82', 85, 78, 36.8, 'Comfortable', 'AV_FISTULA', 300, 500, NOW(), NOW()),
('DS-104', '921234567V', 'Saman Kumara', 'MCH-006', CURDATE() - INTERVAL 20 DAY, '13:00:00', '17:00:00', '13:20:00', '17:20:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '73.1', '70.2', '2.9', '140/88', '122/80', 80, 75, 36.6, 'Comfortable', 'AV_FISTULA', 350, 500, NOW(), NOW()),
('DS-105', '781234567V', 'Nimal Silva', 'MCH-008', CURDATE() - INTERVAL 25 DAY, '09:00:00', '13:00:00', '09:05:00', '13:05:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '59.0', '56.5', '2.5', '125/82', '115/75', 72, 70, 36.5, 'Comfortable', 'CENTRAL_CATHETER', 250, 500, NOW(), NOW());

-- 3. Add Some Sessions for TODAY
INSERT IGNORE INTO dialysis_session (session_id, patient_national_id, patient_name, machine_id, scheduled_date, start_time, end_time, actual_start_time, actual_end_time, duration, status, attendance, session_type, pre_weight, post_weight, fluid_removal, pre_blood_pressure, post_blood_pressure, pre_heart_rate, post_heart_rate, temperature, patient_comfort, dialysis_access, blood_flow, dialysate_flow, created_at, updated_at) VALUES
('DS-106', '881234567V', 'Sunil Perera', 'MCH-001', CURDATE(), '08:00:00', '12:00:00', '08:10:00', '12:10:00', '4 hours', 'COMPLETED', 'PRESENT', 'HEMODIALYSIS', '68.5', '65.4', '3.1', '150/95', '130/85', 88, 80, 36.7, 'Comfortable', 'AV_FISTULA', 300, 500, NOW(), NOW()),
('DS-107', '851234567V', 'Kamal Perera', 'MCH-002', CURDATE(), '10:00:00', '14:00:00', '10:15:00', NULL, NULL, 'IN_PROGRESS', 'PRESENT', 'HEMODIALYSIS', '66.1', NULL, NULL, '142/88', NULL, 84, NULL, 36.6, 'Comfortable', 'AV_FISTULA', 320, 500, NOW(), NOW()),
('DS-108', '781234567V', 'Nimal Silva', 'MCH-004', CURDATE(), '13:00:00', '17:00:00', NULL, NULL, NULL, 'SCHEDULED', 'PENDING', 'HEMODIALYSIS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CENTRAL_CATHETER', NULL, NULL, NOW(), NOW()),
('DS-109', '921234567V', 'Saman Kumara', 'MCH-006', CURDATE(), '14:30:00', '18:30:00', NULL, NULL, NULL, 'SCHEDULED', 'PENDING', 'HEMODIALYSIS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AV_FISTULA', NULL, NULL, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
