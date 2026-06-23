package com.assetvault.AssetVaultBackend.auth.service;

import java.util.HashSet;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.assetvault.AssetVaultBackend.auth.entity.User;
import com.assetvault.AssetVaultBackend.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Custom UserDetailsService
 * Loads user details from database for Spring Security
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Create authorities from user role with null safety
        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Check if role is null
        if (user.getRole() == null) {
            throw new UsernameNotFoundException("User has no role assigned: " + email);
        }
        
        // Check if role name is null
        if (user.getRole().getRoleName() == null) {
            throw new UsernameNotFoundException("User role has no name assigned: " + email);
        }
        
        authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().getRoleName().toString().toUpperCase()));

        return org.springframework.security.core.userdetails.User
                .builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(user.getStatus().toString().equals("INACTIVE"))
                .build();
    }
}
