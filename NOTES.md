
### Why one UPDATE instead of SELECT then UPDATE (reset-password and verify-email). 
Since we use tokens, this was done to ensure that in the case where two request are fired at the same time, only the first request is completed and the second request meets nothing to do. this is called an atomic/ all or nothing approach.

### Why password validation runs before the token is consumed 
The reset token is for single-use, so the password is checked first. If the password is too short, the request is rejected and the token is still valid, so the user can try again. If the token were consumed first, one typo would burn it and force the user to request a new reset link.

### Why reset-password doesn’t set is_verified
The only way to become verified is the email verification link. Keeping one route that can set is_verified means “verified” has a single meaning, and if something looks wrong I only have one place to check.

### Why the admin key check runs before body validation
The key is checked first so someone without it learns nothing about the route. If validation ran first, error messages like “password too short” or “email already exists” would reveal my rules and which emails are registered. With the key check first, every request without the right key gets the same 401 and the same message, whatever is in the body.

### Why timingSafeEqual plus SHA-256, and why the server refuses to boot without the key
Comparing with === stops at the first wrong character, so an attacker could measure response times and guess the key one character at a time. timingSafeEqual takes the same time however many characters match. It needs two buffers of equal length, so I hash both the incoming key and the real key with SHA-256, which always gives 32 bytes. If the server started without a key, or with an empty one, anyone could send an empty header and get in. So the boot check throws an error and the server refuses to start.
