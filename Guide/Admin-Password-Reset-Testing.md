# Admin Password Reset UI Testing

This document explains how to test the Admin password reset flow from the user interface.

## Purpose

Verify that SYSTEM_ADMIN password reset requests are handled through the existing request workflow, and that the high-privilege guard is enforced.

## Test steps

1. Open the application login page and use the **Forgot password?** dialog.
2. Submit the email address of the admin account that needs a reset.
3. Log in as a different active `SYSTEM_ADMIN` and open the Settings page.
4. In the admin inbox, find the pending password reset request and resolve it by entering a temporary password.
5. Confirm the admin account can log in with the temporary password and then change its password.

## Expected behavior

- The request appears in the admin Password Reset Requests inbox.
- A SYSTEM_ADMIN cannot resolve their own request for themselves.
- If there is only one active SYSTEM_ADMIN, the request should not be resolvable in-app and should be handled via emergency support.
- The temporary password is accepted on next login, and the admin can change it.

## Notes

- This flow uses the existing manual reset request system instead of a self-service password reset.
- The app currently treats SYSTEM_ADMIN reset approval as higher risk and requires a different admin when possible.
