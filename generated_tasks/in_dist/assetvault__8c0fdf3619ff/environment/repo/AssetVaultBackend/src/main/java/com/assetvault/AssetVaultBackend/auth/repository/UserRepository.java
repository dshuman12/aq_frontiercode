package com.assetvault.AssetVaultBackend.auth.repository;

import com.assetvault.AssetVaultBackend.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * User Repository
 * Handles database operations for User entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    /**
     * Find user by email
     * @param email User's email
     * @return Optional containing User if found
     */
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE LOWER(u.walletAddress) = LOWER(:walletAddress)")
    Optional<User> findByWalletAddressIgnoreCase(@Param("walletAddress") String walletAddress);
    
    /**
     * Check if email already exists
     * @param email User's email
     * @return true if email exists
     */
    boolean existsByEmail(String email);

    boolean existsByCnic(String cnic);

    boolean existsByCnicAndUserIdNot(String cnic, UUID userId);
}
