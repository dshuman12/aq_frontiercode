# Task description

AssetVault's Spring backend has user, role, JWT, and authentication service code, but the base snapshot does not expose a working HTTP authentication layer or wire Spring Security around it. Add the missing authentication API so clients can sign up, sign in, verify bearer tokens, read the current profile, log out, update a profile, and fetch the hospital names used by the signup form.

Implement the Spring Security configuration in `AssetVaultBackend/src/main/java/com/assetvault/AssetVaultBackend/auth/SecurityConfig.java`. The backend should be stateless, use the existing JWT authentication filter before username/password authentication, expose a BCrypt password encoder and authentication manager, and allow unauthenticated access only for the auth endpoints that must be public plus the existing public health, dashboard, wallet, subscription, activity, notification, report, H2, and actuator routes. Other endpoints should still require authentication. Configure CORS for local frontend origins without weakening the rest of the security model.

Add the auth controller and request/response DTOs under `AssetVaultBackend/src/main/java/com/assetvault/AssetVaultBackend/auth/`. The controller should delegate signup, signin, hospital listing, token verification, current-user lookup, logout, and profile updates to the existing auth service/JWT utilities, return appropriate HTTP statuses for success and failure, and avoid leaking stack traces or sensitive token details in responses. Keep the implementation focused on the auth package and do not rewrite unrelated controllers, repositories, database schemas, blockchain code, or frontend assets.

# Test guidelines

Run the visible validation command:

```bash
cd AssetVaultBackend && mvn test
```

The task is complete when the backend compiles and the normal Maven test workflow succeeds with the new authentication layer in place. If you add tests, keep them in the existing Maven/Spring test tree and prefer focused coverage for security authorization rules and auth response behavior.

# Style guidelines

Follow the surrounding Spring Boot style and package names. Use constructor injection or Lombok consistently with nearby auth classes, keep DTOs simple, and preserve existing service contracts rather than duplicating authentication logic in the controller. Avoid broad dependency, generated-artifact, or formatting churn outside the affected auth files.
