package com.HMS.HMS.config;

import com.HMS.HMS.model.Dialysis.DialysisMachine;
import com.HMS.HMS.model.User.Role;
import com.HMS.HMS.model.User.User;
import com.HMS.HMS.model.ward.Ward;
import com.HMS.HMS.repository.Dialysis.DialysisMachineRepository;
import com.HMS.HMS.repository.UserRepository;
import com.HMS.HMS.repository.WardRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {


    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final WardRepository wardRepo;
    private final DialysisMachineRepository dialysisMachineRepo;

    public DataInitializer(UserRepository userRepo,
                          PasswordEncoder passwordEncoder,
                          WardRepository wardRepo,
                          DialysisMachineRepository dialysisMachineRepo) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.wardRepo = wardRepo;
        this.dialysisMachineRepo = dialysisMachineRepo;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!userRepo.existsById("ADMIN001")) {
            User admin = new User();
            admin.setEmpId("ADMIN001");
            admin.setUsername("defaultadmin");
            admin.setPassword(passwordEncoder.encode("ADMIN001"));
            admin.setRole(Role.ADMIN);
            userRepo.save(admin);
            System.out.println("Default admin created: EMPID=ADMIN001, password=ADMIN001");
        }

        // --- Additional Default Users ---
        if (!userRepo.existsById("CLINIC01")) {
            User cn = new User();
            cn.setEmpId("CLINIC01");
            cn.setUsername("clinicnurse");
            cn.setPassword(passwordEncoder.encode("nurse123"));
            cn.setRole(Role.CLINIC_NURSE);
            userRepo.save(cn);
        }

        if (!userRepo.existsById("WARD01")) {
            User wn = new User();
            wn.setEmpId("WARD01");
            wn.setUsername("wardnurse");
            wn.setPassword(passwordEncoder.encode("nurse123"));
            wn.setRole(Role.WARD_NURSE);
            userRepo.save(wn);
        }

        if (!userRepo.existsById("DIALYSIS01")) {
            User dn = new User();
            dn.setEmpId("DIALYSIS01");
            dn.setUsername("dialysisnurse");
            dn.setPassword(passwordEncoder.encode("nurse123"));
            dn.setRole(Role.DIALYSIS_NURSE);
            userRepo.save(dn);
        }

        if (!userRepo.existsById("DOC01")) {
            User doc = new User();
            doc.setEmpId("DOC01");
            doc.setUsername("doctor");
            doc.setPassword(passwordEncoder.encode("doctor123"));
            doc.setRole(Role.WARD_DOCTOR);
            userRepo.save(doc);
        }

        if (!userRepo.existsById("PHARM01")) {
            User pha = new User();
            pha.setEmpId("PHARM01");
            pha.setUsername("pharmacist");
            pha.setPassword(passwordEncoder.encode("pharm123"));
            pha.setRole(Role.PHARMACIST);
            userRepo.save(pha);
        }

        if (!userRepo.existsById("LAB01")) {
            User lab = new User();
            lab.setEmpId("LAB01");
            lab.setUsername("labtech");
            lab.setPassword(passwordEncoder.encode("lab123"));
            lab.setRole(Role.LAB_TECH);
            userRepo.save(lab);
        }

        if (wardRepo.count() == 0) {
            Ward ward1 = new Ward();
            ward1.setWardName("Ward 1");
            ward1.setWardType("General");

            Ward ward2 = new Ward();
            ward2.setWardName("Ward 2");
            ward2.setWardType("General");

            Ward ward3 = new Ward();
            ward3.setWardName("Ward 3");
            ward3.setWardType("ICU");

            Ward ward4 = new Ward();
            ward4.setWardName("Ward 4");
            ward4.setWardType("Dialysis");

            wardRepo.save(ward1);
            wardRepo.save(ward2);
            wardRepo.save(ward3);
            wardRepo.save(ward4);

            System.out.println("Default wards created: Ward 1-4 with respective types");
        }

        // Initialize dialysis machines
        if (dialysisMachineRepo.count() == 0) {
            DialysisMachine machine1 = new DialysisMachine();
            machine1.setMachineId("DM-001");
            machine1.setMachineName("Dialysis Machine 1");
            machine1.setModel("Fresenius 5008S");
            machine1.setManufacturer("Fresenius Medical Care");
            machine1.setLocation("Ward 4 - Bay A");
            machine1.setStatus(DialysisMachine.MachineStatus.ACTIVE);
            machine1.setLastMaintenance(LocalDate.now().minusDays(30));
            machine1.setMaintenanceIntervalDays(90);
            machine1.setNextMaintenance(LocalDate.now().plusDays(60));
            machine1.setTotalHoursUsed(1250);
            machine1.setNotes("Primary machine for hemodialysis");

            DialysisMachine machine2 = new DialysisMachine();
            machine2.setMachineId("DM-002");
            machine2.setMachineName("Dialysis Machine 2");
            machine2.setModel("Fresenius 5008S");
            machine2.setManufacturer("Fresenius Medical Care");
            machine2.setLocation("Ward 4 - Bay A");
            machine2.setStatus(DialysisMachine.MachineStatus.ACTIVE);
            machine2.setLastMaintenance(LocalDate.now().minusDays(45));
            machine2.setMaintenanceIntervalDays(90);
            machine2.setNextMaintenance(LocalDate.now().plusDays(45));
            machine2.setTotalHoursUsed(980);
            machine2.setNotes("Backup hemodialysis machine");

            DialysisMachine machine3 = new DialysisMachine();
            machine3.setMachineId("DM-003");
            machine3.setMachineName("Dialysis Machine 3");
            machine3.setModel("Gambro AK 200");
            machine3.setManufacturer("Baxter Healthcare");
            machine3.setLocation("Ward 4 - Bay B");
            machine3.setStatus(DialysisMachine.MachineStatus.ACTIVE);
            machine3.setLastMaintenance(LocalDate.now().minusDays(15));
            machine3.setMaintenanceIntervalDays(90);
            machine3.setNextMaintenance(LocalDate.now().plusDays(75));
            machine3.setTotalHoursUsed(1500);
            machine3.setNotes("High-efficiency machine");

            DialysisMachine machine4 = new DialysisMachine();
            machine4.setMachineId("DM-004");
            machine4.setMachineName("Dialysis Machine 4");
            machine4.setModel("Gambro AK 200");
            machine4.setManufacturer("Baxter Healthcare");
            machine4.setLocation("Ward 4 - Bay B");
            machine4.setStatus(DialysisMachine.MachineStatus.ACTIVE);
            machine4.setLastMaintenance(LocalDate.now().minusDays(20));
            machine4.setMaintenanceIntervalDays(90);
            machine4.setNextMaintenance(LocalDate.now().plusDays(70));
            machine4.setTotalHoursUsed(875);
            machine4.setNotes("Recently serviced");

            DialysisMachine machine5 = new DialysisMachine();
            machine5.setMachineId("DM-005");
            machine5.setMachineName("Dialysis Machine 5");
            machine5.setModel("Nikkiso DBB-27");
            machine5.setManufacturer("Nikkiso");
            machine5.setLocation("Ward 4 - Bay C");
            machine5.setStatus(DialysisMachine.MachineStatus.ACTIVE);
            machine5.setLastMaintenance(LocalDate.now().minusDays(10));
            machine5.setMaintenanceIntervalDays(90);
            machine5.setNextMaintenance(LocalDate.now().plusDays(80));
            machine5.setTotalHoursUsed(650);
            machine5.setNotes("Newest addition to the unit");

            DialysisMachine machine6 = new DialysisMachine();
            machine6.setMachineId("DM-006");
            machine6.setMachineName("Dialysis Machine 6");
            machine6.setModel("Nikkiso DBB-27");
            machine6.setManufacturer("Nikkiso");
            machine6.setLocation("Ward 4 - Bay C");
            machine6.setStatus(DialysisMachine.MachineStatus.ACTIVE);
            machine6.setLastMaintenance(LocalDate.now().minusDays(25));
            machine6.setMaintenanceIntervalDays(90);
            machine6.setNextMaintenance(LocalDate.now().plusDays(65));
            machine6.setTotalHoursUsed(1100);
            machine6.setNotes("Excellent reliability record");

            dialysisMachineRepo.save(machine1);
            dialysisMachineRepo.save(machine2);
            dialysisMachineRepo.save(machine3);
            dialysisMachineRepo.save(machine4);
            dialysisMachineRepo.save(machine5);
            dialysisMachineRepo.save(machine6);

            System.out.println("Default dialysis machines created: DM-001 to DM-006 (6 active machines)");
        }
    }
}
