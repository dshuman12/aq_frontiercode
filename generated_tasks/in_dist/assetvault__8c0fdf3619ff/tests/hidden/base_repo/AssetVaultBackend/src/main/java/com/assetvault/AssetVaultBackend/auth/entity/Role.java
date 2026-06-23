package com.assetvault.AssetVaultBackend.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

/**
 * Role Entity
 * Maps to the database
 */
@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "role_id")
    private UUID roleId;
    
    @Column(name = "role_name", nullable = false, unique = true)
    @Enumerated(EnumType.STRING)
    private RoleType roleName;
    
    public enum RoleType {
        patient,
        hospital_admin,
        hospital_staff,
        insurance_company,
        bank_staff,
        admin
    }
}
