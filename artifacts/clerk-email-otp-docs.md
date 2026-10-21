# Build a custom sign-in flow with email or phone code

> This guide is for users who want to build a custom flow. To use a _prebuilt_ UI, use the [Account Portal pages](https://clerk.com/docs/guides/account-portal/overview.md?sdk=expo) or [prebuilt components](https://clerk.com/docs/expo/reference/components/overview.md).

> This guide applies to the following Clerk SDKs:
>
> - `@clerk/react` v6 or higher
> - `@clerk/nextjs` v7 or higher
> - `@clerk/expo` v3 or higher
> - `@clerk/react-router` v3 or higher
> - `@clerk/tanstack-react-start` v0.26.0 or higher
>
> If you're using an older version of one of these SDKs, or are using the legacy API, refer to the [legacy API documentation](https://clerk.com/docs/guides/development/custom-flows/authentication/legacy/email-sms-otp.md?sdk=expo).

Clerk supports passwordless authentication, which lets users sign in and sign up without having to remember a password. Instead, users receive a one-time password (OTP) via email or phone, which they can use to authenticate themselves.

This guide demonstrates how to build a custom user interface for signing up and signing in using phone OTP. The process for using email OTP is similar, and the differences will be highlighted throughout.

> In Clerk's prebuilt components, after requesting an email or SMS verification code, users must wait 30 seconds before requesting another. This resend cooldown is separate from code expiration: the current code remains valid for 10 minutes and can still be entered after the cooldown ends.

1. ## Enable phone OTP

   To use phone OTP:

   1. In the Clerk Dashboard, navigate to the [**User & authentication**](https://dashboard.clerk.com/~/user-authentication/user-and-authentication) page.
   2. Disable all email authentication settings, or these examples will error.
   3. Select the **Phone** tab and enable **Sign-up with phone** and **Sign-in with phone**. It's recommended to enable **Verify at sign-up**.
   4. Ensure **Password** is disabled, as you want to use SMS OTP and not password authentication.

   To use email OTP:

   1. In the Clerk Dashboard, navigate to the [**User & authentication**](https://dashboard.clerk.com/~/user-authentication/user-and-authentication) page.
   2. Ensure **Require email address** is enabled.
   3. Ensure **Verify at sign-up** is enabled, with **Email verification code** selected.
   4. Ensure **Sign-in with email** is enabled, with **Email verification code** selected.
   5. Ensure **Password** is disabled, as you want to use email OTP and not password authentication.

   **For AI agents:** Instead of toggling these settings in the Dashboard, run `npx clerk@latest config patch --json '{"auth_email":{"used_for_sign_up":false,"used_for_sign_in":false,"sign_in_strategies":[]},"auth_phone":{"used_for_sign_up":true,"verify_at_sign_up":true,"verification_strategies":["phone_code"],"used_for_sign_in":true,"sign_in_strategies":["phone_code"]},"auth_password":{"enabled":false,"required":false}}'` to disable email authentication, enable phone OTP, and disable password authentication. Run `npx clerk@latest config schema --keys auth_phone auth_email` to see all available settings, including the email OTP equivalents. Install [Clerk's skills](https://clerk.com/docs/guides/ai/skills.md?sdk=expo) with `npx skills add clerk/skills` for correct CLI and SDK usage.
2. ## Sign-up flow

   First, understand that the `useSignUp()` hook returns an object with the following properties:

   - `signUp`: The [SignUpFuture](https://clerk.com/docs/expo/reference/objects/sign-up-future.md) object. Use this to initiate the sign-up process and check the current state of the sign-up attempt.
   - `errors`: The [Errors](https://clerk.com/docs/expo/reference/types/errors.md) object that contains the errors that occurred during the last API request. You can use this to display errors to the user in your custom UI.
   - `fetchStatus`: The fetch status of the underlying [SignUpFuture](https://clerk.com/docs/expo/reference/objects/sign-up-future.md) resource. You can use this to display a loading state or disable buttons while the request is in progress.

   Then, to sign up a user using their phone number and verify their sign-up with an SMS code, you must:

   1. Initiate the sign-up process by collecting the user's phone number with the [signUp.create()](https://clerk.com/docs/expo/reference/objects/sign-up-future.md#create) method.
   2. Send a one-time code to the provided phone number for verification with the [signUp.verifications.sendPhoneCode()](https://clerk.com/docs/expo/reference/objects/sign-up-future.md#verifications-sendphonecode) method (or [signUp.verifications.sendEmailCode()](https://clerk.com/docs/expo/reference/objects/sign-up-future.md#verifications-sendemailcode) if you're modifying this example for email OTP).
   3. Collect the one-time code and verify it with the [signUp.verifications.verifyPhoneCode()](https://clerk.com/docs/expo/reference/objects/sign-up-future.md#verifications-verifyphonecode) method (or [signUp.verifications.verifyEmailCode()](https://clerk.com/docs/expo/reference/objects/sign-up-future.md#verifications-verifyemailcode) if you're modifying this example for email OTP).
      > Phone numbers must be in [E.164 format](https://en.wikipedia.org/wiki/E.164).
   4. If the phone number verification is successful, finalize the sign-up with the [signUp.finalize()](https://clerk.com/docs/expo/reference/objects/sign-up-future.md#finalize) method to create the user and set the newly created session as the active session.

   filename: src/app/sign-up/page.tsx

   ```tsx
   import { ThemedText } from '@/components/themed-text'
   import { ThemedView } from '@/components/themed-view'
   import { useSignUp } from '@clerk/expo'
   import { type Href, Link, useRouter } from 'expo-router'
   import React from 'react'
   import { Pressable, StyleSheet, TextInput, View } from 'react-native'

   export default function Page() {
     const { signUp, errors, fetchStatus } = useSignUp()
     const router = useRouter()

     // For email OTP: collect the email address instead of the phone number
     const [phoneNumber, setPhoneNumber] = React.useState('')
     const [code, setCode] = React.useState('')

     const handleSubmit = async () => {
       // For email OTP: change create({ phoneNumber }) to create({ emailAddress })
       const { error } = await signUp.create({ phoneNumber })
       if (error) {
         console.error(JSON.stringify(error, null, 2))
         return
       }

       // For email OTP: change sendPhoneCode() to sendEmailCode()
       if (!error) await signUp.verifications.sendPhoneCode()
     }

     const handleVerify = async () => {
       // For email OTP: change verifyPhoneCode() to verifyEmailCode()
       await signUp.verifications.verifyPhoneCode({ code })

       if (signUp.status === 'complete') {
         await signUp.finalize({
           navigate: ({ session, decorateUrl }) => {
             // Handle session tasks
             // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
             if (session?.currentTask) {
               console.log(session?.currentTask)
               return
             }

             // If no session tasks, navigate the signed-in user to the home page
             const url = decorateUrl('/')
             if (url.startsWith('http')) {
               window.location.href = url
             } else {
               router.push(url as Href)
             }
           },
         })
       } else {
         // Check why the sign-up is not complete
         console.error('Sign-up attempt not complete:', signUp)
       }
     }

     if (signUp.status === 'complete') {
       return null
     }

     if (
       signUp.status === 'missing_requirements' &&
       // For email OTP: check for email_address instead of phone_number
       signUp.unverifiedFields.includes('phone_number') &&
       signUp.missingFields.length === 0
     ) {
       return (
         <ThemedView style={styles.container}>
           <ThemedText type="title" style={styles.title}>
             Verify your account
           </ThemedText>
           <TextInput
             style={styles.input}
             value={code}
             placeholder="Enter verification code"
             placeholderTextColor="#666666"
             onChangeText={(code) => setCode(code)}
             keyboardType="numeric"
           />
           {errors.fields.code && (
             <ThemedText style={styles.error}>{errors.fields.code.message}</ThemedText>
           )}
           <Pressable
             style={({ pressed }) => [
               styles.button,
               fetchStatus === 'fetching' && styles.buttonDisabled,
               pressed && styles.buttonPressed,
             ]}
             onPress={handleVerify}
             disabled={fetchStatus === 'fetching'}
           >
             <ThemedText style={styles.buttonText}>Verify</ThemedText>
           </Pressable>
           <Pressable
             style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
             // For email OTP: change sendPhoneCode() to sendEmailCode()
             onPress={() => signUp.verifications.sendPhoneCode()}
           >
             <ThemedText style={styles.secondaryButtonText}>I need a new code</ThemedText>
           </Pressable>
         </ThemedView>
       )
     }

     return (
       <ThemedView style={styles.container}>
         <ThemedText type="title" style={styles.title}>
           Sign up
         </ThemedText>
         <ThemedText style={styles.label}>Phone number</ThemedText>
         {/* For email OTP: collect the emailAddress instead */}
         <TextInput
           style={styles.input}
           value={phoneNumber}
           placeholder="Enter phone number"
           placeholderTextColor="#666666"
           onChangeText={(phoneNumber) => setPhoneNumber(phoneNumber)}
           keyboardType="phone-pad"
         />
         {errors.fields.phoneNumber && (
           <ThemedText style={styles.error}>{errors.fields.phoneNumber.message}</ThemedText>
         )}
         <Pressable
           style={({ pressed }) => [
             styles.button,
             (!phoneNumber || fetchStatus === 'fetching') && styles.buttonDisabled,
             pressed && styles.buttonPressed,
           ]}
           onPress={handleSubmit}
           disabled={!phoneNumber || fetchStatus === 'fetching'}
         >
           <ThemedText style={styles.buttonText}>Continue</ThemedText>
         </Pressable>
         {/* For your debugging purposes. You can just console.log errors, but we put them in the UI for convenience */}
         {errors && <ThemedText style={styles.debug}>{JSON.stringify(errors, null, 2)}</ThemedText>}

         <View style={styles.linkContainer}>
           <ThemedText>Already have an account? </ThemedText>
           <Link href="/sign-in">
             <ThemedText type="link">Sign in</ThemedText>
           </Link>
         </View>
       </ThemedView>
     )
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       padding: 20,
       gap: 12,
     },
     title: {
       marginBottom: 8,
     },
     label: {
       fontWeight: '600',
       fontSize: 14,
     },
     input: {
       borderWidth: 1,
       borderColor: '#ccc',
       borderRadius: 8,
       padding: 12,
       fontSize: 16,
       backgroundColor: '#fff',
     },
     button: {
       backgroundColor: '#0a7ea4',
       paddingVertical: 12,
       paddingHorizontal: 24,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 8,
     },
     buttonPressed: {
       opacity: 0.7,
     },
     buttonDisabled: {
       opacity: 0.5,
     },
     buttonText: {
       color: '#fff',
       fontWeight: '600',
     },
     secondaryButton: {
       paddingVertical: 12,
       paddingHorizontal: 24,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 8,
     },
     secondaryButtonText: {
       color: '#0a7ea4',
       fontWeight: '600',
     },
     linkContainer: {
       flexDirection: 'row',
       gap: 4,
       marginTop: 12,
       alignItems: 'center',
     },
     error: {
       color: '#d32f2f',
       fontSize: 12,
       marginTop: -8,
     },
     debug: {
       fontSize: 10,
       opacity: 0.5,
       marginTop: 8,
     },
   })
   ```
3. ## Sign-in flow

   First, understand that the `useSignIn()` hook returns an object with the following properties:

   - `signIn`: The [SignInFuture](https://clerk.com/docs/expo/reference/objects/sign-in-future.md) object. Use this to initiate the sign-in process and check the current state of the sign-in attempt.
   - `errors`: The [Errors](https://clerk.com/docs/expo/reference/types/errors.md) object that contains the errors that occurred during the last API request. You can use this to display errors to the user in your custom UI.
   - `fetchStatus`: The fetch status of the underlying [SignInFuture](https://clerk.com/docs/expo/reference/objects/sign-in-future.md) resource. You can use this to display a loading state or disable buttons while the request is in progress.

   1. Initiate the sign-in process by collecting the user's phone number with the [signIn.phoneCode.sendCode()](https://clerk.com/docs/expo/reference/objects/sign-in-future.md#phonecode-sendcode) method.
   2. Collect the one-time code and verify it with the [signIn.phoneCode.verifyCode()](https://clerk.com/docs/expo/reference/objects/sign-in-future.md#phonecode-verifycode) method (or [signIn.emailCode.verifyCode()](https://clerk.com/docs/expo/reference/objects/sign-in-future.md#emailcode-verifycode) if you're modifying this example for email OTP).
      > Phone numbers must be in [E.164 format](https://en.wikipedia.org/wiki/E.164).
   3. If the phone number verification is successful, finalize the sign-in with the [signIn.finalize()](https://clerk.com/docs/expo/reference/objects/sign-in-future.md#finalize) method to set the newly created session as the active session.

   filename: src/app/sign-in/page.tsx

   ```tsx
   import { ThemedText } from '@/components/themed-text'
   import { ThemedView } from '@/components/themed-view'
   import { useSignIn } from '@clerk/expo'
   import { type Href, Link, useRouter } from 'expo-router'
   import React from 'react'
   import { Pressable, StyleSheet, TextInput, View } from 'react-native'

   export default function Page() {
     const { signIn, errors, fetchStatus } = useSignIn()
     const router = useRouter()

     // For email OTP: collect the email address instead of the phone number
     const [phoneNumber, setPhoneNumber] = React.useState('')
     const [code, setCode] = React.useState('')

     const handleSubmit = async () => {
       // For email OTP: change phoneNumber to emailAddress
       const { error } = await signIn.create({ identifier: phoneNumber })
       if (error) {
         // See https://clerk.com/docs/guides/development/custom-flows/error-handling
         console.error(JSON.stringify(error, null, 2))
         return
       }

       // For email OTP: change phoneCode.sendCode() to emailCode.sendCode()
       if (!error) await signIn.phoneCode.sendCode({ phoneNumber })

       if (signIn.status === 'complete') {
         await signIn.finalize({
           navigate: ({ session, decorateUrl }) => {
             // Handle session tasks
             // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
             if (session?.currentTask) {
               console.log(session?.currentTask)
               return
             }

             // If no session tasks, navigate the signed-in user to the home page
             const url = decorateUrl('/')
             if (url.startsWith('http')) {
               window.location.href = url
             } else {
               router.push(url as Href)
             }
           },
         })
       } else if (signIn.status === 'needs_second_factor') {
         // See https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication
       } else if (signIn.status === 'needs_client_trust') {
         // See https://clerk.com/docs/guides/development/custom-flows/authentication/device-trust
       } else {
         // Check why the sign-in is not complete
         console.error('Sign-in attempt not complete:', signIn)
       }
     }

     const handleVerification = async () => {
       // For email OTP: change phoneCode.verifyCode() to emailCode.verifyCode()
       await signIn.phoneCode.verifyCode({ code })

       if (signIn.status === 'complete') {
         await signIn.finalize({
           navigate: ({ session, decorateUrl }) => {
             // Handle session tasks
             // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
             if (session?.currentTask) {
               console.log(session?.currentTask)
               return
             }

             // If no session tasks, navigate the signed-in user to the home page
             const url = decorateUrl('/')
             if (url.startsWith('http')) {
               window.location.href = url
             } else {
               router.push(url as Href)
             }
           },
         })
       } else {
         // Check why the sign-in is not complete
         console.error('Sign-in attempt not complete:', signIn)
       }
     }

     if (signIn.status === 'needs_first_factor') {
       return (
         <ThemedView style={styles.container}>
           <ThemedText type="title" style={styles.title}>
             Verify your phone number
           </ThemedText>
           <TextInput
             style={styles.input}
             value={code}
             placeholder="Enter your verification code"
             placeholderTextColor="#666666"
             onChangeText={(code) => setCode(code)}
             keyboardType="numeric"
           />
           {errors.fields.code && (
             <ThemedText style={styles.error}>{errors.fields.code.message}</ThemedText>
           )}
           <Pressable
             style={({ pressed }) => [
               styles.button,
               fetchStatus === 'fetching' && styles.buttonDisabled,
               pressed && styles.buttonPressed,
             ]}
             onPress={handleVerification}
             disabled={fetchStatus === 'fetching'}
           >
             <ThemedText style={styles.buttonText}>Verify</ThemedText>
           </Pressable>
           <Pressable
             style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
             // For email OTP: change phoneCode.sendCode() to emailCode.sendCode()
             onPress={() => signIn.phoneCode.sendCode()}
           >
             <ThemedText style={styles.secondaryButtonText}>I need a new code</ThemedText>
           </Pressable>
           <Pressable
             style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
             onPress={() => signIn.reset()}
           >
             <ThemedText style={styles.secondaryButtonText}>Start over</ThemedText>
           </Pressable>
         </ThemedView>
       )
     }

     return (
       <ThemedView style={styles.container}>
         <ThemedText type="title" style={styles.title}>
           Sign in
         </ThemedText>
         {/* For email OTP: collect the email address instead of the phone number */}
         <ThemedText style={styles.label}>Phone number</ThemedText>
         <TextInput
           style={styles.input}
           value={phoneNumber}
           placeholder="Enter phone number"
           placeholderTextColor="#666666"
           onChangeText={(phoneNumber) => setPhoneNumber(phoneNumber)}
           keyboardType="phone-pad"
         />
         {errors.fields.identifier && (
           <ThemedText style={styles.error}>{errors.fields.identifier.message}</ThemedText>
         )}
         <Pressable
           style={({ pressed }) => [
             styles.button,
             (!phoneNumber || fetchStatus === 'fetching') && styles.buttonDisabled,
             pressed && styles.buttonPressed,
           ]}
           onPress={handleSubmit}
           disabled={!phoneNumber || fetchStatus === 'fetching'}
         >
           <ThemedText style={styles.buttonText}>Continue</ThemedText>
         </Pressable>
         {/* For your debugging purposes. You can just console.log errors, but we put them in the UI for convenience */}
         {errors && <ThemedText style={styles.debug}>{JSON.stringify(errors, null, 2)}</ThemedText>}

         <View style={styles.linkContainer}>
           <ThemedText>Don't have an account? </ThemedText>
           <Link href="/sign-up">
             <ThemedText type="link">Sign up</ThemedText>
           </Link>
         </View>
       </ThemedView>
     )
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       padding: 20,
       gap: 12,
     },
     title: {
       marginBottom: 8,
     },
     label: {
       fontWeight: '600',
       fontSize: 14,
     },
     input: {
       borderWidth: 1,
       borderColor: '#ccc',
       borderRadius: 8,
       padding: 12,
       fontSize: 16,
       backgroundColor: '#fff',
     },
     button: {
       backgroundColor: '#0a7ea4',
       paddingVertical: 12,
       paddingHorizontal: 24,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 8,
     },
     buttonPressed: {
       opacity: 0.7,
     },
     buttonDisabled: {
       opacity: 0.5,
     },
     buttonText: {
       color: '#fff',
       fontWeight: '600',
     },
     secondaryButton: {
       paddingVertical: 12,
       paddingHorizontal: 24,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 8,
     },
     secondaryButtonText: {
       color: '#0a7ea4',
       fontWeight: '600',
     },
     linkContainer: {
       flexDirection: 'row',
       gap: 4,
       marginTop: 12,
       alignItems: 'center',
     },
     error: {
       color: '#d32f2f',
       fontSize: 12,
       marginTop: -8,
     },
     debug: {
       fontSize: 10,
       opacity: 0.5,
       marginTop: 8,
     },
   })
   ```

---

## Sitemap

[Overview of all docs pages](https://clerk.com/docs/llms.txt)

