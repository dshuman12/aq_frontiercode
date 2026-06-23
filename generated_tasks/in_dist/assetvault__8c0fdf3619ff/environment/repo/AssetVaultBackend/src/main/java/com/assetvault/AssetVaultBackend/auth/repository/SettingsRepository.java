package com.assetvault.AssetVaultBackend.auth.repository;

import com.assetvault.AssetVaultBackend.auth.entity.Settings;
import com.assetvault.AssetVaultBackend.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Settings Repository
 * Handles database operations for Settings entity
 */
@Repository
public interface SettingsRepository extends JpaRepository<Settings, UUID> {
    
    /**
     * Find settings by user
     * @param user User object
     * @return Optional containing Settings if found
     */
    Optional<Settings> findByUser(User user);
}
