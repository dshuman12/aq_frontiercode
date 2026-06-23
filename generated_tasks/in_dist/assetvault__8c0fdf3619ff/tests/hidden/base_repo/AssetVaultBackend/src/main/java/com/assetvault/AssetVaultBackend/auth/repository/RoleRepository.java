package com.assetvault.AssetVaultBackend.auth.repository;

import com.assetvault.AssetVaultBackend.auth.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Role Repository
 * Handles database operations for Role entity
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    
    /**
     * Find role by role name
     * @param roleName Role name enum
     * @return Optional containing Role if found
     */
    Optional<Role> findByRoleName(Role.RoleType roleName);
}
