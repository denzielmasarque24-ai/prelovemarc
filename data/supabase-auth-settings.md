# Supabase Auth Settings for Signup

Use this checklist in the Supabase dashboard if signup returns:

`AuthApiError: Email address 'admin@gmail.com' is invalid`

That error comes from Supabase Auth after the frontend has already accepted the email format.

1. Open Supabase Dashboard > Authentication > Providers > Email.
2. Turn on Email provider and Email signup.
3. Turn off Confirm email if users should be logged in immediately after signup.
4. Remove any email/domain allowlist, blocklist, or custom Auth Hook that rejects public email domains.
5. Make sure `gmail.com` is not blocked and there is no `.edu` or company-domain-only rule.
6. Save the settings and test registration with `admin@gmail.com`.

The frontend normalizes emails with `email.trim().toLowerCase()` and accepts normal email formats with:

```ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

If the browser console logs `[RegisterForm] frontend validation failed`, the email was blocked before Supabase.
If it logs `[RegisterForm] Supabase signUp error`, the email reached Supabase and was rejected by Auth settings or an Auth hook.

## 429 Too Many Requests

If Supabase returns `email rate limit exceeded`, the email is valid and the signup request reached Supabase. The project has temporarily throttled signup/email attempts for that address.

The register form blocks duplicate submits while the request is running and adds a 5-second cooldown after each attempt. That prevents accidental double-clicks from creating request bursts, but Supabase can still return 429 if the same email was tried many times recently.

Wait a few minutes before trying the same email again. For local testing, use a different test email or delete the partially-created Auth user from Authentication > Users before retrying. Also confirm that email confirmation is off if you do not want signup to send confirmation emails.
