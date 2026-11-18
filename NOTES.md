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

### Why 401 with one fixed message on the admin route
A caller without the right key hasn’t been authenticated, so the route returns 401. (403 would mean “known user, not allowed”.) The message is identical for a missing header, a wrong key and a wrong type, so an attacker can’t tell which part failed. I left out “expired” because my key never expires, and the word would hint at how the key works.

### Why limits are per IP, and why forgot-password is tight
Limits count per IP, not per account, because an account lock would let an attacker lock me out of my own account just by typing wrong passwords for my email. Login uses skipSuccessfulRequests, so only failed attempts count and real users aren’t blocked. Forgot-password is tight because it could flood a victim’s inbox and each request replaces their pending reset token. Email providers also cap sends.

### What error.status === 400 links between the helper and the routes
validateAndSanitizeBody throws an error with status = 400 and a message when input is bad. The controller’s catch checks error.status === 400 and returns that message as a 400. The number is the only link between the two files, so a typo in either place turns a validation error into a 500 with no warning. Testing a bad body is the best way I would catch it.

### What a controller does that a route file doesn’t
The route file decides where a request goes and which checks run first, such as rate limiters and auth middleware. The controller holds the logic: reading the request, calling helpers, querying the database and sending the response. The limiter stays in the route file because it must run before the controller, so a blocked request (429) never reaches the handler and never costs bcrypt or database work.

### Who enforces CORS
The browser enforces CORS. My server sends the response, and the browser checks whether the response carries permission (the Access-Control-Allow-Origin header) for the page’s origin. If not, the page’s JavaScript can’t read the data. Tools like Postman ignore CORS, so it protects browser users, not the API itself.

### Why not cors({ origin: "*" })
" * " lets any website’s JavaScript read my API’s responses, which removes the browser’s protection. It’s worse if I ever move to cookie-based login. I allow only specific, trusted origins, read from an environment variable, so I can change them per environment without touching the code.

### Why a security scheme and not a normal field in the docs
A security scheme describes the proof of identity or permission, not the data. The admin key (x-admin-secret) and the Bearer JWT are proof, so they are not part of the JSON body. I declare each one once in the docs, and every route that needs it reuses it, which also gives me the Authorize button so I paste the key or token one time. Headers are not secret, so the reason is not hiding. The reason is what the thing is: proof, not data.

### Why the docs show real status codes, and only the real ones
The docs show the real status codes (400, 401, 403, 409, 429) so that anyone using the API can understand exactly why they got an error. I only list codes the route really returns, because docs that promise something the code doesn’t do are worse than short docs. When a route changes, I update openapi.yaml in the same commit.

### Why Render for the web service and Neon for the database
I put the web service on Render and the database on Neon. Render’s free web service goes idle after about 15 minutes, and the first request then takes 30 to 60 seconds to wake it, but after that it is fast, which is fine for a portfolio demo. Render’s free database expires (30 days in one source I read, 90 in another), and I would need a paid plan to get it back, so my data would not last. Neon’s free database has monthly usage limits instead of an expiry date, and it wakes quickly after sleeping, so it fits better. Free plans change, so I check the official pages before relying on the numbers.

### Why one DATABASE_URL instead of five PG_ variables
One connection string is simpler than five variables: there is one value to set, so fewer chances for a typo. The same name works on my laptop and on Render, and only the value changes (local database on my laptop, Neon on Render), so the code never changes. Neon’s string also carries the encryption option (sslmode=require), which the five variables had no place for. If a password has special characters like @, they must be URL-encoded (@ becomes %40), or the string is misread. Variable names are case-sensitive on Render, so I write DATABASE_URL in capitals everywhere.

### Why trust proxy is set on Render but wasn't needed on my laptop
On my laptop, requests come straight to my server, so Express sees each visitor's real IP. On Render, every request first passes through Render's proxy, so without a setting Express sees the proxy's address for everyone. My rate limits count per IP, so all visitors would share one counter, and one busy person could lock out everybody else. app.set('trust proxy', 1) tells Express to trust one proxy in front of it and read the real client IP from the X-Forwarded-For header. The number is 1 because there is one proxy. If I set it too high, a caller could fake the header and dodge my limits.

### Why the schema runs on Neon's direct string and the app uses the pooled one
Neon gives two connection strings. The pooled one (the host with -pooler) goes through a middleman that shares a limited number of real database connections between many clients, which suits a running app that opens many connections. The direct one connects straight to the database, so I used it once from my own machine to create the tables. The app uses the pooled string as DATABASE_URL on Render. This is the usual recommendation, and I confirm it against Neon's docs when things change. The connection string contains my password, so it only goes into Render's environment settings and never into git or a chat.

### Why Nodemailer with Gmail SMTP instead of Resend
Nodemailer is only a library. It does not deliver email by itself, it talks to a mail server over SMTP, so I had to choose a server, and I chose Gmail. Resend would only send to my own address until I verified a domain, and Gmail sends to anyone. This project is a demo for a handful of people, an interviewer or someone trying the app, so Gmail's low sending limits are fine. I use a dedicated Gmail account with an app password, not my personal account, so if the password ever leaks I lose a throwaway inbox and not my main one. The app password is only available after 2-step verification is on, and it goes in .env and in Render's environment settings, never in git or a chat. Gmail replaces the sender with the logged-in address, so EMAIL_FROM is the same address as SMTP_USER. I check Google's current limits and rules before relying on any number.

### Why only mailer.js changed when I switched providers
I split the email code in two layers. sendEmail is the only function that talks to the provider. sendVerificationEmail builds the link and the message, then calls sendEmail. The controllers only call sendVerificationEmail, so they never know which provider is used. When I moved from Resend to Nodemailer, I rewrote sendEmail and left the controllers alone.

### Why sendEmail must throw when sending fails
If sendEmail caught the error itself, the try/catch in register would never run, and a failed email would pass silently with nothing logged. Nodemailer's sendMail already rejects by itself when sending fails, so sendEmail does not need its own error check. While switching I had a leftover Resend line, throw new Error(error...), that crashed the code with "error is not defined" before any email was attempted, because Nodemailer has no error object like Resend's response. I removed that leftover line and left no try/catch that would swallow the failure. I proved the failure path by putting a wrong SMTP_PASS and checking that the script reported an error and registration still returned 201.

### Why a failed email does not fail registration
By the time the email is sent, the user row is already saved, so returning an error would tell the user their sign-up failed when it actually worked. The email call has its own try/catch inside the handler, after the INSERT. If sending fails I log it with console.error and still return 201, with a message that tells the user to request a new link if nothing arrives. The recovery path is the resend-verification route, which sends a new token and returns the same generic 200 whether or not the account exists.

### Why SMTP can fail after deployment even if it works locally
Some hosts block outbound SMTP ports (25, 465, 587), including on free plans, to stop spam. On my laptop nothing blocks them, so mail works, and after deploying the same code can fail silently, because the error is only logged. I check the host's current policy and test a real registration on the deployed app, not only locally. If SMTP is blocked, the fix is to send through an email provider that uses an HTTPS API instead, and since only sendEmail talks to the provider, that is a change to one function.