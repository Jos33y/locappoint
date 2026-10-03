# Supabase Email Templates

Brand-aligned transactional email templates for Locappoint.

## Files

| File | Supabase template slot |
|------|------------------------|
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset Password |

## Where to paste

1. Supabase Dashboard -> your project -> **Authentication** -> **Email Templates**
2. Pick the matching template tab (Confirm signup OR Reset password)
3. The "Message" field expects HTML. Replace whatever is there with the contents of the corresponding `.html` file (open in your editor, copy all, paste).
4. The "Subject heading" field is separate. Suggested values:
   - Confirm signup: `Verify your Locappoint email`
   - Reset password: `Reset your Locappoint password`
5. Save.

## What to keep / what NOT to edit in the HTML

- `{{ .ConfirmationURL }}` is the Supabase template variable. **Do not change it.** It appears twice per file (the button + the fallback link). Both are needed.
- The two-tone wordmark uses inline color spans. Do not collapse them.
- Inline styles are intentional. Email clients (especially Outlook) strip or ignore `<style>` blocks. Do not move styles into the head.

## How to test before going live

In Supabase:
1. Save the template
2. Authentication -> **Users** -> pick a test user (or create one)
3. Three dots menu -> **Send password reset** OR **Send invite**
4. Check the inbox

Test inboxes you should check at minimum:
- Gmail web (most common, has dark mode)
- Apple Mail on iOS (renders well, also has dark mode)
- Outlook desktop (worst case for HTML email — uses Word rendering engine)

The `color-scheme: light` meta locks the email to light rendering so Gmail / Apple Mail dark mode does not invert and mangle colors.

## Brand discipline applied

- All hex colors from locked palette only: Ink `#0B1530`, Azure `#2D7FF0`, Signal `#E89A3E`, neutrals
- Wordmark: `Loc` in Ink, `Appoint` in Azure (matches the actual brand mark)
- No gradients anywhere
- No emojis
- No glow / glass / decorative effects
- Solid azure CTA button (not gradient)
- Flat surfaces, 1px borders, 14px border-radius on outer container
- System font stack (no web fonts: too unreliable across email clients)
- Table-based layout for Outlook compatibility
- Mobile responsive at 600px breakpoint
- Hidden preview text for inbox snippet

## If you want to add more templates later

Other Supabase auth email slots that exist but I have not built yet:
- Magic Link
- Change Email Address
- Invite user
- Reauthentication

When you need any of them, copy `confirm-signup.html` as a starting template, swap the heading + body text + button label. Keep the layout, colors, and wordmark identical so all auth emails feel like one system.
