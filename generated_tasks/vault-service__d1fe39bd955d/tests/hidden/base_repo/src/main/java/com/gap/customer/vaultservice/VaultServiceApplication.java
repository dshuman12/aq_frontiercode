package com.gap.customer.vaultservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.circuitbreaker.EnableCircuitBreaker;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.gap.customer.vaultservice.*","com.gap.gid.*"})
@Configuration
@EnableScheduling
@EnableCircuitBreaker
public class VaultServiceApplication {

	public static void main(String[] args) {
       SpringApplication.run(VaultServiceApplication.class, args);
	}
}
