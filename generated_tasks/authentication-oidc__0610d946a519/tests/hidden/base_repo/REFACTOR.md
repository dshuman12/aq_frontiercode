## Refactors

A list of refactors to be used in place in the service

---

`biometrics-authorize.ts`

- get credit account state: Flag
- check flag against account states

`biometrics-reg-initiate.ts`

- get customer details
- check customer `onmoId` against request `onmoId`

- ```
  // required properties

  {
    firstName: string
    lastName: string
    onmoId: uuid
  }
  ```

`extra-scope-authorize.ts`

- customer details: `firstName`

`extra-scope-authorize.eligibility.js`

- `getCard - { cardId, isActivated, status }`
- `getAccountState`
- `approvedDate`
- `forgot-pass-authorize-in.ts`

- get customerDetails
- ```typescript
  {
    onmoId;
    mobileNumber;
    emailAddress;
    firstName;
  }
  ```

`forgot-pass-authorize-out.ts`

- get credit account flags
- get customer details
- ```typescript
  {
    onmoId;
    mobileNumber;
    emailAddress;
    firstName;
  }
  ```
- isEligible

`userInfo.ts`

- handle `mambuCreditCardAccountId`
- getCardId

`otp-passcode-authorize.ts`

- get credit account state

`otp-passcode-sendOTP.ts`

- credit account state
- customer details `{ onmoId, mobileNumber }`

`sendOTP.ts`

- customer details `{ mobileNumber, onmoId}`

`phone-change-validate-otp.ts`

- customer details `{email} `

`testUtils.ts`
