# vault-service

Vault service is an encryption service to store customers PII data

## Dashboards

- Prod : https://one.newrelic.com/nr1-core/apm-features/overview/MTMzNDc2NnxBUE18QVBQTElDQVRJT058NDQwMTIxNjk1?account=1334766&duration=21600000&state=b7466c09-5bdc-87f2-a299-4b74e8ceec39
- Prod-preview : https://one.newrelic.com/nr1-core/apm-features/overview/MTMzNDc2NnxBUE18QVBQTElDQVRJT058NjczMzM4Njk3?account=1334766&duration=21600000&state=669b3092-ba05-ddd5-b0f4-04b8c54a5ec1
-
Stage : https://one.newrelic.com/nr1-core/apm-features/overview/MTU0MjQwNXxBUE18QVBQTElDQVRJT058NDI3NjYxMzMy?account=1542405&duration=21600000&filters=%28domain%20%3D%20%27APM%27%20AND%20type%20%3D%20%27APPLICATION%27%29&state=464a83f3-5135-bbc6-0e6a-7b7c887862af
-
Stage-preview: https://one.newrelic.com/nr1-core/apm-features/overview/MTU0MjQwNXxBUE18QVBQTElDQVRJT058Njk1MTcxNzU4?account=1542405&duration=21600000&filters=%28domain%20%3D%20%27APM%27%20AND%20type%20%3D%20%27APPLICATION%27%29&state=b5498f27-7c71-e364-e9f9-3308e51d7033
-
Test : https://one.newrelic.com/nr1-core/apm-features/overview/MTU0MjQwNXxBUE18QVBQTElDQVRJT058NDgxMTAxNjM1?account=1542405&duration=21600000&filters=%28domain%20%3D%20%27APM%27%20AND%20type%20%3D%20%27APPLICATION%27%29&state=d1746f77-b0bf-00ed-c3e2-e22e98a40cc8
## Modernized Vault Service AAD
- https://confluence.gapinc.com/display/GAT/Modernized+Vault+Service+AAD

## Development Guidelines

1. Java Coding Standards:
   https://confluence.gapinc.com/display/CDTPM/Coding+Standards
2. Use Functional programming (Lambda expressions, Streams, Optional, etc.) wherever applicable and as much as possible.
3. Strictly follow Test Driven Development.
4. VaultServiceException to be the Top level Base Exception inheriting from Throwable.
5. Create different properties files for every environment, select based on spring active profile.
6. Each Method must always have Single responsibility.
7. Execute Functional test locally after completion of Code for Validation.
8. Create Pull request -> Get Peer review done -> Get final review done -> Merge.

## Tech Stack

| Tech         | Version           |
|--------------|-------------------|
| Java         | 11                |
| Springboot   | 2.6.1             |
| Azure SQL DB | mssql-jdbc: 9.2.1 |
| PCF          |                   |

## External Services
- **Bluefin** : To tokenize and de-tokenize credit card numbers
- **Voltage** : To tokenize and de-tokenize credit card numbers (Will be completely replaced by Bluefin)
- **Ingrian** : To encrypt and decrypt data

## How to build the application

To compile and run tests we can simply run a build clean.
```sh
./gradlew clean build
```
Prerequisites to run locally:
- Add ingrian pre-prod cert to java cacerts with the following command
  - ```sh
    sudo $JAVA_HOME/bin/keytool -import -trustcacerts -keystore $JAVA_HOME/lib/security/cacerts -storepass changeit -noprompt -alias ingrian_cert -file <cert path>    
    ```
- Add artifactory username and password to your gradle.properties file
  - ```sh
    vi ~/.gradle/gradle.properties
    ```
- Set spring active profile as **azeustest**
- Add the encryption key to your environment variables
  - ```encrypt_key = <Your key here>```
  
### Run the application in local

```sh
./gradlew bootRun
```

### Run contract Tests
```sh
./gradlew contractTest
```

### Run performance Tests

Performance tests will run this repo
```sh
./gradlew performanceTest
```  
## Documentation
- Swagger : https://github.gapinc.com/customer/vault-service/blob/master/src/main/resources/static/swagger-vault-new.json

## Pipeline
- https://profile-ci.pipeline.gaptech.com:8443/view/Azure%20Jobs/view/Vault%20Service%20Jobs/


## Other Related Repositories
- Functional Tests : https://github.gapinc.com/customer/vault-service-functional-tests
- Contract Tests : https://github.gapinc.com/customer/apigee-vault-service-contract