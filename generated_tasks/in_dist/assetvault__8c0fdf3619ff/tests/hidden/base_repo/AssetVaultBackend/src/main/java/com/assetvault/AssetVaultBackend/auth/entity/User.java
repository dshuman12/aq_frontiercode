package com.assetvault.AssetVaultBackend.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * User Entity
 * Maps to the database
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private UUID userId;
    
    @ManyToOne
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
    
    @Column(name = "name", nullable = false)
    private String name;
    
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    
    @Column(name = "cnic", unique = true)
    private String cnic;

    @Column(name = "gender")
    private String gender;

    @Column(name = "nationality")
    private String nationality;

    @Column(name = "cnic_issue_date")
    private LocalDate cnicIssueDate;

    @Column(name = "cnic_expiry_date")
    private LocalDate cnicExpiryDate;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "phone_num")
    private String phoneNum;
    
    @Column(name = "address")
    private String address;
    
    @Column(name = "city")
    private String city;
    
    @Column(name = "blood_group")
    private String bloodGroup;

    @Column(name = "occupation")
    private String occupation;

    @Column(name = "source_of_income")
    private String sourceOfIncome;

    @Column(name = "health_issues")
    private String healthIssues;

    @Column(name = "country")
    private String country;

    @Column(name = "postal_code")
    private String postalCode;
    
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
    
    @Column(name = "hospital_id")
    private java.util.UUID hospitalId;

    /**
     * On-chain wallet address (lowercased 0x… checksum-stripped) assigned at signup
     * from the configured Hardhat pool. Patients also keep a wallet on the Patient
     * entity for legacy reasons; the WalletAllocator dedupes across both tables.
     */
    @Column(name = "wallet_address", unique = true)
    private String walletAddress;
    
    @Column(name = "mfa_enabled")
    private Boolean mfaEnabled = false;
    
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private UserStatus status = UserStatus.ACTIVE;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum UserStatus {
        ACTIVE,
        INACTIVE
    }
}
