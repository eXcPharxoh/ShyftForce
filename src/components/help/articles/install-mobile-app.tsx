import { Prose, Callout, Steps } from "../prose";

export default function Article() {
  return (
    <Prose>
      <p>ShyftForce isn't on the App Store or Google Play (yet) — but you can add it to your phone in 10 seconds and use it just like any other app. It even gets push notifications. Here's how, by phone type.</p>

      <h3>On iPhone (Safari)</h3>
      <Steps>
        <li>Open <b>Safari</b> on your iPhone (not Chrome — has to be Safari) and go to <b>app.shyftforce.com</b>.</li>
        <li>Sign in to your account.</li>
        <li>Tap the <b>Share button</b> at the bottom of the screen (the square with an arrow pointing up).</li>
        <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
        <li>Tap <b>Add</b>. You'll see a ShyftForce icon on your home screen — tap it like any app.</li>
      </Steps>

      <h3>On Android (Chrome)</h3>
      <Steps>
        <li>Open <b>Chrome</b> on your Android phone and go to <b>app.shyftforce.com</b>.</li>
        <li>Sign in.</li>
        <li>Tap the <b>three dots</b> in the top-right corner.</li>
        <li>Tap <b>Add to Home screen</b> (sometimes shown as &quot;Install app&quot;).</li>
        <li>Tap <b>Install</b>. The icon appears on your home screen.</li>
      </Steps>

      <Callout kind="tip" title="Why bother?">
        Once installed, ShyftForce opens full-screen (no browser bar), works offline for viewing your schedule, and can send you push notifications when shifts change or coverage is needed. It's the same as a regular app from the store — the only difference is you got it in 10 seconds without an App Store review.
      </Callout>

      <h3>Turning on notifications</h3>
      <p>After you install, open the app and go to <b>Settings → Security &amp; privacy → Get alerts on this device</b>. Tap the <b>Allow alerts</b> button. Your phone may ask you again to confirm — say yes. You'll now get alerts for shift offers, schedule changes, and time-off decisions.</p>

      <h3>Doesn't work on iOS 16.3 or older</h3>
      <p>Push notifications need iPhone iOS 16.4 or newer. If you're on an older iPhone, you can still install the app and see your schedule — you just won't get push alerts. Email and SMS still work.</p>
    </Prose>
  );
}
