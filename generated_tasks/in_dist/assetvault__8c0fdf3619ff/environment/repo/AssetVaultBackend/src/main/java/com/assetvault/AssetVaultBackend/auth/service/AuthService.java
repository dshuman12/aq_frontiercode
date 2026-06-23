package com.assetvault.AssetVaultBackend.auth.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.assetvault.AssetVaultBackend.auth.dto.AuthResponse;
import com.assetvault.AssetVaultBackend.auth.dto.SigninRequest;
import com.assetvault.AssetVaultBackend.auth.dto.SignupRequest;
import com.assetvault.AssetVaultBackend.auth.entity.Role;
import com.assetvault.AssetVaultBackend.auth.entity.Settings;
import com.assetvault.AssetVaultBackend.auth.entity.User;
import com.assetvault.AssetVaultBackend.auth.repository.RoleRepository;
import com.assetvault.AssetVaultBackend.auth.repository.SettingsRepository;
import com.assetvault.AssetVaultBackend.auth.repository.UserRepository;
import com.assetvault.AssetVaultBackend.auth.util.JwtUtil;
import com.assetvault.AssetVaultBackend.bank.entity.Bank;
import com.assetvault.AssetVaultBackend.bank.repository.BankRepository;
import com.assetvault.AssetVaultBackend.patient.service.PatientWalletAllocatorService;
import com.assetvault.AssetVaultBackend.patient.entity.Patient;
import com.assetvault.AssetVaultBackend.patient.repository.PatientRepository;

import lombok.RequiredArgsConstructor;
import com.assetvault.AssetVaultBackend.hospital.repository.HospitalRepository;

/**
 * Auth Service
 * Contains business logic for user authentication and registration
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SettingsRepository settingsRepository;
    private final JwtUtil jwtUtil;
    private final JdbcTemplate jdbcTemplate;
    private final HospitalRepository hospitalRepository;
    private final BankRepository bankRepository;
    private final PatientRepository patientRepository;
    private final PatientWalletAllocatorService patientWalletAllocatorService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * Call stored procedure to log user activity
     * 
     * @param procedureName Name of the stored procedure (usp_log_login,
     *                      usp_log_logout, usp_log_profile_update)
     * @param userId        User ID
     * @param description   Activity description
     */
    private void callActivityProcedure(String procedureName, java.util.UUID userId, String description) {
        try {
            String sql = String.format("CALL public.%s(?, ?)", procedureName);
            jdbcTemplate.update(sql, userId, description);
            System.out.println("Activity logged via procedure: " + procedureName);
        } catch (Exception e) {
            System.err.println("Failed to log activity via procedure: " + e.getMessage());
            // Don't throw exception, just log error to prevent interrupting auth flow
        }
    }

    private AuthResponse buildAuthResponse(User user, String role, String token) {
        AuthResponse response = new AuthResponse(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                role,
                token);
        response.setPhoneNum(user.getPhoneNum());
        response.setAddress(user.getAddress());
        response.setCity(user.getCity());
        response.setBloodGroup(user.getBloodGroup());
        response.setDateOfBirth(user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : null);
        response.setHospitalId(user.getHospitalId());
        if (user.getHospitalId() != null) {
            hospitalRepository.findById(user.getHospitalId())
                    .ifPresent(hospital -> response.setHospitalName(hospital.getHospitalName()));
        }

        // Set patientId + wallet address if user is a patient (wallet lives on Patient row)
        if ("PATIENT".equalsIgnoreCase(role)) {
            patientRepository.findByUserId(user.getUserId())
                    .ifPresent(patient -> {
                        response.setPatientId(patient.getId());
                        response.setWalletAddress(patient.getWalletAddress());
                    });
        } else {
            // For non-patient roles wallet is stored directly on the User entity.
            response.setWalletAddress(user.getWalletAddress());
        }

        return response;
    }

    /**
     * User Sign Up
     * 
     * @param request SignupRequest containing user details
     * @return AuthResponse with user data and token if successful
     */
    @Transactional
    public AuthResponse signup(SignupRequest request) {
        // Validate request
        if (!request.isValid()) {
            return new AuthResponse(false, "Invalid request data");
        }

        // Allowed self-registration roles
        String requestedRole = request.getRole().toLowerCase().trim();
        if (!requestedRole.equals("patient") && !requestedRole.equals("hospital_admin")
                && !requestedRole.equals("hospital_staff") && !requestedRole.equals("bank_staff")) {
            return new AuthResponse(false, "Invalid signup role.");
        }

        // Validate role-specific requirements
        if (requestedRole.equals("hospital_staff") && (request.getHospitalName() == null || request.getHospitalName().isBlank())) {
            return new AuthResponse(false, "Hospital name is required for hospital staff signup.");
        }
        if (requestedRole.equals("bank_staff") && (request.getBankName() == null || request.getBankName().isBlank())) {
            return new AuthResponse(false, "Bank name is required for bank staff signup.");
        }

        // Normalize email
        String email = request.getEmail().trim().toLowerCase();

        System.out.println("Attempting signup for email: " + email);
        System.out.println("Requested role: " + request.getRole());

        // Check if email already exists
        if (userRepository.existsByEmail(email)) {
            return new AuthResponse(false, "Email already registered");
        }

        // Check if CNIC already exists
        if (userRepository.existsByCnic(request.getCnic().trim())) {
            return new AuthResponse(false, "CNIC already registered");
        }

        // Validate password strength
        if (request.getPassword().length() < 6) {
            return new AuthResponse(false, "Password must be at least 6 characters");
        }

        try {
            // Get role
            Role.RoleType roleType = Role.RoleType.valueOf(request.getRole().toLowerCase());
            System.out.println("Looking for role type: " + roleType);
            System.out.println("Total roles in database: " + roleRepository.count());

            Optional<Role> roleOpt = roleRepository.findByRoleName(roleType);

            if (roleOpt.isEmpty()) {
                System.out.println("Role not found: " + roleType);
                return new AuthResponse(false, "Invalid role provided");
            }

            Role role = roleOpt.get();
            System.out.println("Role found: " + role.getRoleName());

            // Create new user
            User newUser = new User();
            newUser.setName(request.getName());
            newUser.setEmail(email);
            newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            newUser.setCnic(request.getCnic());
            newUser.setPhoneNum(request.getPhoneNum());
            newUser.setAddress(request.getAddress());
            newUser.setCity(request.getCity());
            newUser.setBloodGroup(request.getBloodGroup());

            // For hospital_admin, hospitalName is required
            if (roleType == Role.RoleType.hospital_admin &&
                    (request.getHospitalName() == null || request.getHospitalName().trim().isEmpty())) {
                return new AuthResponse(false, "Hospital name is required for hospital admin signup");
            }

            // Look up hospital by name if provided (for patient, hospital_staff,
            // hospital_admin roles)
            java.util.UUID hospitalId = null;
            if (request.getHospitalName() != null && !request.getHospitalName().trim().isEmpty()) {
                Optional<com.assetvault.AssetVaultBackend.hospital.entity.Hospital> hospitalOpt = hospitalRepository
                        .findByHospitalName(request.getHospitalName().trim());

                if (hospitalOpt.isPresent()) {
                    hospitalId = hospitalOpt.get().getHospitalId();
                    newUser.setHospitalId(hospitalId);
                    System.out.println("Hospital found: " + request.getHospitalName() + " with ID: " + hospitalId);
                } else {
                    System.out.println("Hospital not found by name: " + request.getHospitalName());
                    // For patient/staff, hospital must already exist
                    if (roleType == Role.RoleType.patient) {
                        return new AuthResponse(false, "Hospital not found: " + request.getHospitalName());
                    }
                    // For hospital_admin, create a brand-new hospital record
                    if (roleType == Role.RoleType.hospital_admin) {
                        com.assetvault.AssetVaultBackend.hospital.entity.Hospital newHospital = new com.assetvault.AssetVaultBackend.hospital.entity.Hospital();
                        java.util.UUID newHospitalId = java.util.UUID.randomUUID();
                        newHospital.setHospitalId(newHospitalId);
                        newHospital.setHospitalName(request.getHospitalName().trim());
                        newHospital.setRegistrationNum("REG-" + newHospitalId.toString().substring(0, 8).toUpperCase());
                        newHospital.setAddress(
                                request.getAddress() != null && !request.getAddress().isEmpty() ? request.getAddress()
                                        : "Pending");
                        newHospital.setContactNum(request.getPhoneNum() != null && !request.getPhoneNum().isEmpty()
                                ? request.getPhoneNum()
                                : "Pending");
                        newHospital.setEmail(request.getEmail());
                        newHospital.setCity(request.getCity());
                        newHospital.setVerificationStatus(
                                com.assetvault.AssetVaultBackend.hospital.entity.Hospital.VerificationStatus.PENDING);
                        newHospital.setCreatedAt(java.time.LocalDateTime.now());
                        newHospital.setUpdatedAt(java.time.LocalDateTime.now());
                        com.assetvault.AssetVaultBackend.hospital.entity.Hospital savedHospital = hospitalRepository
                                .save(newHospital);
                        hospitalId = savedHospital.getHospitalId();
                        newUser.setHospitalId(hospitalId);
                        System.out.println(
                                "New hospital created: " + request.getHospitalName() + " with ID: " + hospitalId);
                    }
                }
            }

            // For bank_staff, ensure there is a corresponding row in banks table.
            if (roleType == Role.RoleType.bank_staff) {
                createOrReuseBankRecord(request, email);
            }

            // Parse date of birth if provided
            if (request.getDateOfBirth() != null && !request.getDateOfBirth().isEmpty()) {
                try {
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
                    newUser.setDateOfBirth(LocalDate.parse(request.getDateOfBirth(), formatter));
                } catch (Exception e) {
                    return new AuthResponse(false, "Invalid date format. Use YYYY-MM-DD");
                }
            }

            newUser.setRole(role);
            newUser.setStatus(User.UserStatus.ACTIVE);
            newUser.setMfaEnabled(false);

            // Save user
            User savedUser = userRepository.save(newUser);
            System.out.println("User saved successfully with ID: " + savedUser.getUserId());
            System.out.println("User email in DB: " + savedUser.getEmail());

            // Create default settings for user
            Settings settings = new Settings();
            settings.setUser(savedUser);
            settings.setMultiFactorEnabled(false);
            settings.setEmailVerified(false);
            settings.setNotificationEnabled(true);
            settingsRepository.save(settings);

            // Create patient record if patient signup (allocates wallet on Patient entity)
            if (roleType == Role.RoleType.patient) {
                ensurePatientRecordWithWallet(savedUser, hospitalId);
            } else {
                // Hospital admin / hospital staff / bank staff — assign a wallet directly
                // to the User entity from the same Hardhat pool. Best-effort: a missing
                // pool or exhaustion logs an error but does not block signup.
                try {
                    String allocated = patientWalletAllocatorService.assignWalletToUser(savedUser);
                    System.out.println("Allocated wallet " + allocated + " to user " + savedUser.getEmail());
                } catch (Exception walletErr) {
                    System.err.println("Wallet allocation failed for " + savedUser.getEmail()
                            + ": " + walletErr.getMessage());
                }
            }

            // Generate JWT token
            String token = jwtUtil.generateToken(
                    savedUser.getUserId(),
                    savedUser.getEmail(),
                    savedUser.getRole().getRoleName().toString());

            System.out.println("Token generated successfully");

            return buildAuthResponse(savedUser, role.getRoleName().toString(), token);

        } catch (IllegalArgumentException e) {
            System.out.println("Invalid role error: " + e.getMessage());
            return new AuthResponse(false, "Invalid role: " + request.getRole());
        } catch (Exception e) {
            System.out.println("Error creating user: " + e.getMessage());
            e.printStackTrace();
            return new AuthResponse(false, "Error creating user: " + e.getMessage());
        }
    }

    private void ensurePatientRecordWithWallet(User user, UUID hospitalId) {
        Patient patient = patientRepository.findByUserId(user.getUserId())
                .orElseGet(() -> {
                    Patient created = new Patient();
                    created.setUserId(user.getUserId());
                    created.setHospitalId(hospitalId != null ? hospitalId : user.getHospitalId());
                    created.setHasAsset(false);
                    created.setHasSubscription(false);
                    created.setKycStatus(Patient.KycStatus.PENDING);
                    return patientRepository.save(created);
                });

        if (patient.getHospitalId() == null && (hospitalId != null || user.getHospitalId() != null)) {
            patient.setHospitalId(hospitalId != null ? hospitalId : user.getHospitalId());
            patientRepository.save(patient);
        }

        patientWalletAllocatorService.assignWalletToPatient(patient);
    }

    /**
     * User Sign In
     * 
     * @param request SigninRequest containing email and password
     * @return AuthResponse with user data and token if successful
     */
    public AuthResponse signin(SigninRequest request) {
        // Validate request
        if (!request.isValid()) {
            return new AuthResponse(false, "Email and password are required");
        }

        // Normalize email
        String email = request.getEmail().trim().toLowerCase();

        System.out.println("Attempting signin for email: " + email);
        System.out.println("Total users in database: " + userRepository.count());

        // Find user by email
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            System.out.println("User not found in database for email: " + email);
            return new AuthResponse(false, "User not found");
        }

        User user = userOpt.get();
        System.out.println("User found: " + user.getEmail() + ", Status: " + user.getStatus());

        // Check if user is active
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            return new AuthResponse(false, "User account is not active");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            System.out.println("Password mismatch for user: " + email);
            return new AuthResponse(false, "Invalid password");
        }

        System.out.println("Password verified, generating token");

        // Generate JWT token
        String token = jwtUtil.generateToken(
                user.getUserId(),
                user.getEmail(),
                user.getRole().getRoleName().toString());

        // Log LOGIN activity via stored procedure
        callActivityProcedure("usp_log_login", user.getUserId(), "User successfully logged in");

        return buildAuthResponse(user, user.getRole().getRoleName().toString(), token);
    }

    private void createOrReuseBankRecord(SignupRequest request, String email) {
        if (bankRepository.findByEmail(email).isPresent()) {
            return;
        }

        Bank bank = new Bank();
        UUID bankId = UUID.randomUUID();
        String resolvedName = request.getBankName() != null && !request.getBankName().trim().isEmpty()
                ? request.getBankName().trim()
                : request.getName().trim() + " Bank";

        bank.setBankId(bankId);
        bank.setBankName(resolvedName);
        bank.setRegistration("BANK-REG-" + bankId.toString().substring(0, 8).toUpperCase());
        bank.setSwiftCode(null);
        bank.setBankCode("B-" + bankId.toString().substring(0, 6).toUpperCase());
        bank.setAddress(request.getAddress() != null && !request.getAddress().isBlank() ? request.getAddress().trim()
                : "Pending");
        bank.setEmail(email);
        bank.setContactNum(
                request.getPhoneNum() != null && !request.getPhoneNum().isBlank() ? request.getPhoneNum().trim()
                        : "Pending");
        bank.setCity(request.getCity());
        bank.setVerificationStatus(Bank.VerificationStatus.PENDING);

        bankRepository.save(bank);
    }

    /**
     * Get user by email
     * 
     * @param email User email
     * @return AuthResponse with user data
     */
    public AuthResponse getUserByEmail(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return new AuthResponse(false, "User not found");
        }

        User user = userOpt.get();
        return buildAuthResponse(user, user.getRole().getRoleName().toString(), "");
    }

    /**
     * Get hospital names for signup dropdown
     * 
     * @return List of hospital names
     */
    public List<String> getHospitalNames() {
        List<String> hospitalNames = hospitalRepository.findAll().stream()
                .map(com.assetvault.AssetVaultBackend.hospital.entity.Hospital::getHospitalName)
                .filter(name -> name != null && !name.trim().isEmpty())
                .distinct()
                .sorted(String::compareToIgnoreCase)
                .toList();

        System.out.println("[AuthService] getHospitalNames count = " + hospitalNames.size());
        System.out.println("[AuthService] getHospitalNames values = " + hospitalNames);

        return hospitalNames;
    }

    /**
     * Verify JWT token
     * 
     * @param token JWT token to verify
     * @return AuthResponse with user data if token is valid
     */
    public AuthResponse verifyToken(String token) {
        try {
            if (!jwtUtil.validateToken(token)) {
                return new AuthResponse(false, "Invalid token");
            }

            String email = jwtUtil.getEmailFromToken(token);
            String role = jwtUtil.getRoleFromToken(token);

            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isEmpty()) {
                return new AuthResponse(false, "User not found");
            }

            User user = userOpt.get();
            return buildAuthResponse(user, role, token);

        } catch (Exception e) {
            return new AuthResponse(false, "Token verification failed: " + e.getMessage());
        }
    }

    /**
     * User Logout - Calls stored procedure to log logout activity
     * 
     * @param email User email
     */
    public void logoutUser(String email) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase());

            if (userOpt.isPresent()) {
                User user = userOpt.get();
                callActivityProcedure("usp_log_logout", user.getUserId(), "User successfully logged out");
                System.out.println("User logged out: " + email);
            }
        } catch (Exception e) {
            System.err.println("Error logging out user: " + e.getMessage());
        }
    }

    /**
     * Update user profile - Calls stored procedure to update user table AND log
     * activity
     * 
     * @param userId  User ID
     * @param updates Map of fields to update
     * @return AuthResponse with updated user data
     */
    public AuthResponse updateProfile(java.util.UUID userId, java.util.Map<String, String> updates) {
        try {
            Optional<User> userOpt = userRepository.findById(userId);

            if (userOpt.isEmpty()) {
                return new AuthResponse(false, "User not found");
            }

            // Extract update values (null if not provided)
            String name = updates.get("name");
            String phoneNum = updates.get("phoneNum");
            String address = updates.get("address");
            String city = updates.get("city");
            String bloodGroup = updates.get("bloodGroup");

            // Check if at least one field is being updated
            if (name == null && phoneNum == null && address == null && city == null && bloodGroup == null) {
                return new AuthResponse(false, "No fields to update");
            }

            // Call stored procedure to update user table AND log activity
            String sql = "CALL public.usp_log_profile_update(?, ?, ?, ?, ?, ?)";
            jdbcTemplate.update(sql, userId, name, phoneNum, address, city, bloodGroup);

            System.out.println("User profile updated via stored procedure: " + userId);

            // Fetch updated user from database
            User updatedUser = userRepository.findById(userId).orElseThrow();
            return buildAuthResponse(updatedUser, updatedUser.getRole().getRoleName().toString(), "");

        } catch (Exception e) {
            System.err.println("Error updating user profile: " + e.getMessage());
            e.printStackTrace();
            return new AuthResponse(false, "Update failed: " + e.getMessage());
        }
    }
}