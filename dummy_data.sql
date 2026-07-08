-- =====================================================================
-- Hospital Management System - Dummy Data Seeder
-- =====================================================================
-- Run this script to populate the database with realistic data for 
-- testing dashboards, visualizations, and generating reports.
-- Command to run inside docker:
-- docker exec -i hms-mysql mysql -u root -p'my_secure_password' hms < dummy_data.sql
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1. Patients Data
-- --------------------------------------------------------
INSERT IGNORE INTO patient (national_id, first_name, last_name, address, date_of_birth, contact_number, emergency_contact_number, gender, registration_date) VALUES
('901234567V', 'Kamal', 'Perera', '123 Main St, Colombo', '1990-05-15', '0771234567', '0712345678', 'MALE', '2023-01-10 10:00:00'),
('851234567V', 'Nimali', 'Silva', '45 Temple Rd, Kandy', '1985-08-20', '0777654321', '0719876543', 'FEMALE', '2023-02-15 11:30:00'),
('921234567V', 'Ruwan', 'Fernando', '78 Beach Rd, Galle', '1992-11-10', '0711122334', '0772233445', 'MALE', '2023-03-20 09:15:00'),
('781234567V', 'Sunethra', 'Kumari', '12 Lake View, Kurunegala', '1978-02-25', '0723344556', '0784455667', 'FEMALE', '2023-04-05 14:45:00'),
('951234567V', 'Kasun', 'Bandara', '34 Hill St, Nuwara Eliya', '1995-07-30', '0755566778', '0766677889', 'MALE', '2023-05-12 16:20:00'),
('801234567V', 'Amara', 'Jayasinghe', '56 Park Ave, Negombo', '1980-12-05', '0788899001', '0700011223', 'FEMALE', '2023-06-18 08:30:00'),
('881234567V', 'Chathura', 'Ratnayake', '90 River Side, Matara', '1988-09-15', '0744455667', '0711122334', 'MALE', '2023-07-22 10:10:00'),
('981234567V', 'Sanduni', 'Senanayake', '23 Temple Rd, Anuradhapura', '1998-04-10', '0766677889', '0777654321', 'FEMALE', '2023-08-05 13:40:00'),
('821234567V', 'Nuwan', 'Gunawardena', '67 Main St, Polonnaruwa', '1982-10-20', '0723344556', '0755566778', 'MALE', '2023-09-12 15:55:00'),
('911234567V', 'Tharushi', 'Weerasinghe', '89 Hill St, Badulla', '1991-03-25', '0712345678', '0788899001', 'FEMALE', '2023-10-28 09:25:00');

-- --------------------------------------------------------
-- 2. Doctors Data (Assumes User table also has them, but this populates Doctor specific table)
-- --------------------------------------------------------
INSERT IGNORE INTO doctors (employee_id, doctor_name, specialization) VALUES
(101, 'Dr. Anil Peiris', 'Cardiology'),
(102, 'Dr. Sujani Fernando', 'Neurology'),
(103, 'Dr. Mahendra Silva', 'Orthopedics'),
(104, 'Dr. Chamari Perera', 'Pediatrics'),
(105, 'Dr. Roshan Bandara', 'General Surgery');

-- --------------------------------------------------------
-- 3. Wards Data
-- --------------------------------------------------------
INSERT IGNORE INTO ward (ward_id, ward_name, ward_type) VALUES
(1, 'General Ward - Male', 'GENERAL'),
(2, 'General Ward - Female', 'GENERAL'),
(3, 'ICU', 'INTENSIVE_CARE'),
(4, 'Pediatric Ward', 'PEDIATRIC'),
(5, 'Maternity Ward', 'MATERNITY'),
(6, 'Dialysis Unit', 'SPECIALIZED');

-- --------------------------------------------------------
-- 4. Admissions Data
-- --------------------------------------------------------
INSERT IGNORE INTO admission (admission_id, patient_national_id, ward_id, bed_number, admission_date, discharge_date, status) VALUES
(1, '901234567V', 1, 'B-01', '2023-10-01 10:00:00', '2023-10-05 14:00:00', 'DISCHARGED'),
(2, '851234567V', 2, 'B-05', '2023-10-10 11:30:00', NULL, 'ACTIVE'),
(3, '921234567V', 3, 'ICU-1', '2023-10-15 09:15:00', NULL, 'ACTIVE'),
(4, '781234567V', 2, 'B-08', '2023-10-20 14:45:00', '2023-10-25 10:00:00', 'DISCHARGED'),
(5, '951234567V', 1, 'B-12', '2023-10-28 16:20:00', NULL, 'ACTIVE'),
(6, '911234567V', 5, 'M-02', '2023-11-01 08:30:00', NULL, 'ACTIVE');

-- --------------------------------------------------------
-- 5. Appointments Data
-- --------------------------------------------------------
INSERT IGNORE INTO appointments (appointment_id, doctor_employee_id, patient_national_id, appointment_date, appointment_time, status, appointment_type, created_at) VALUES
(1, 101, '901234567V', CURDATE(), '09:00:00', 'COMPLETED', 'CONSULTATION', NOW() - INTERVAL 1 DAY),
(2, 102, '851234567V', CURDATE(), '10:30:00', 'SCHEDULED', 'FOLLOW_UP', NOW() - INTERVAL 2 DAY),
(3, 103, '921234567V', CURDATE(), '11:15:00', 'SCHEDULED', 'CONSULTATION', NOW() - INTERVAL 3 DAY),
(4, 104, '781234567V', CURDATE() + INTERVAL 1 DAY, '14:00:00', 'SCHEDULED', 'ROUTINE_CHECKUP', NOW()),
(5, 105, '951234567V', CURDATE() + INTERVAL 2 DAY, '15:30:00', 'SCHEDULED', 'CONSULTATION', NOW()),
(6, 101, '801234567V', CURDATE() + INTERVAL 3 DAY, '09:30:00', 'SCHEDULED', 'FOLLOW_UP', NOW()),
(7, 102, '881234567V', CURDATE() - INTERVAL 1 DAY, '11:00:00', 'COMPLETED', 'CONSULTATION', NOW() - INTERVAL 5 DAY),
(8, 103, '981234567V', CURDATE() - INTERVAL 2 DAY, '13:45:00', 'CANCELLED', 'ROUTINE_CHECKUP', NOW() - INTERVAL 6 DAY);

-- --------------------------------------------------------
-- 6. Medications Data (Pharmacy Inventory)
-- --------------------------------------------------------
INSERT IGNORE INTO medications (id, drug_name, generic_name, category, strength, dosage_form, manufacturer, batch_number, current_stock, minimum_stock, maximum_stock, unit_cost, expiry_date, created_at, updated_at, is_active) VALUES
(1, 'Panadol', 'Paracetamol', 'Analgesic', '500mg', 'Tablet', 'GSK', 'B1001', 5000, 1000, 10000, 2.50, '2025-12-31', NOW(), NOW(), 1),
(2, 'Amoxil', 'Amoxicillin', 'Antibiotic', '250mg', 'Capsule', 'Pfizer', 'B1002', 2000, 500, 5000, 15.00, '2024-10-15', NOW(), NOW(), 1),
(3, 'Lipitor', 'Atorvastatin', 'Statin', '20mg', 'Tablet', 'Pfizer', 'B1003', 1500, 300, 3000, 25.50, '2026-05-20', NOW(), NOW(), 1),
(4, 'Glucophage', 'Metformin', 'Antidiabetic', '500mg', 'Tablet', 'Merck', 'B1004', 3000, 600, 6000, 12.75, '2025-08-10', NOW(), NOW(), 1),
(5, 'Ventolin', 'Salbutamol', 'Bronchodilator', '100mcg', 'Inhaler', 'GSK', 'B1005', 400, 100, 1000, 450.00, '2024-11-30', NOW(), NOW(), 1),
(6, 'Lasix', 'Furosemide', 'Diuretic', '40mg', 'Tablet', 'Sanofi', 'B1006', 1200, 250, 2500, 8.25, '2025-03-25', NOW(), NOW(), 1),
(7, 'Erythro', 'Erythromycin', 'Antibiotic', '250mg', 'Tablet', 'Abbott', 'B1007', 800, 200, 2000, 18.00, '2024-09-12', NOW(), NOW(), 1),
(8, 'Norvasc', 'Amlodipine', 'Calcium Channel Blocker', '5mg', 'Tablet', 'Pfizer', 'B1008', 2500, 500, 5000, 10.50, '2026-01-15', NOW(), NOW(), 1);

SET FOREIGN_KEY_CHECKS = 1;
