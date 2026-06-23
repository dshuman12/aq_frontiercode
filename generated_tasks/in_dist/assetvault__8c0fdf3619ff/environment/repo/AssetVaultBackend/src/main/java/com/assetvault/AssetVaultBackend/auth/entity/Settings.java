package com.assetvault.AssetVaultBackend.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

/**
 * Settings Entity
 * Maps to the database
 * Stores user-specific preferences and settings
 */
@Entity
@Table(name = "settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Settings {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "setting_id")
    private UUID settingId;
    
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    
    @Column(name = "multi_factor_enabled")
    private Boolean multiFactorEnabled = false;
    
    @Column(name = "email_verified")
    private Boolean emailVerified = false;
    
    @Column(name = "notification_enabled")
    private Boolean notificationEnabled = true;
}
