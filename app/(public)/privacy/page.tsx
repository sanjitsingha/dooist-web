import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PRIVACY_PATH, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Dooist collects, uses, stores and protects your information across the Dooist Android app, web app and website.",
  alternates: { canonical: `${SITE.url}${PRIVACY_PATH}` },
};

const LAST_UPDATED = "22 November 2026";

const SECTIONS = [
  { id: "who-we-are", title: "Who we are" },
  { id: "information-we-collect", title: "Information we collect" },
  { id: "on-your-device", title: "Information kept on your device" },
  { id: "how-we-use", title: "How we use your information" },
  { id: "notifications", title: "Notifications" },
  { id: "google", title: "Google sign-in and Google Calendar" },
  { id: "sharing", title: "Who we share information with" },
  { id: "international", title: "Where your information is processed" },
  { id: "retention", title: "How long we keep information" },
  { id: "security", title: "How we protect your information" },
  { id: "your-rights", title: "Your rights and choices" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const LINK =
  "rounded-sm font-medium text-accent-dark underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const index = SECTIONS.findIndex((section) => section.id === id);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 pt-10">
      <h2 id={`${id}-title`} className="text-xl font-bold tracking-[-0.2px] text-text">
        {index + 1}. {SECTIONS[index].title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-[25px] text-text">
        {children}
      </div>
    </section>
  );
}

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-base font-semibold text-text">{children}</h3>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-subtle">{children}</ul>;
}

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

function Email() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className={LINK}>
      {SITE.contactEmail}
    </a>
  );
}

function Contents() {
  return (
    <ol className="flex flex-col gap-0.5 text-[13px]">
      {SECTIONS.map(({ id, title }, index) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className="flex gap-1.5 rounded-md px-2 py-1 text-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          >
            <span className="tabular-nums">{index + 1}.</span>
            {title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Written from what the Android app, web app and backend actually do. Keep it in step with them. */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto grid w-full max-w-[1040px] gap-10 px-5 py-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-14">
      <aside className="hidden lg:block">
        <nav
          aria-label="On this page"
          className="sticky top-6 max-h-[calc(100dvh-48px)] overflow-y-auto"
        >
          <p className="mb-2 px-2 text-[13px] font-semibold text-text">On this page</p>
          <Contents />
        </nav>
      </aside>

      <article className="min-w-0 max-w-[720px]">
        <header>
          <h1 className="text-[34px] leading-[42px] font-semibold tracking-[-0.8px] text-text">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
          <p className="mt-5 text-base leading-[27px] text-text">
            This Privacy Policy explains what information Dooist collects, how we use it, who helps
            us run the service, and the choices you have. It applies to the Dooist Android app, the
            web app at {SITE.appDomain}, and our website at {SITE.domain} (together, “Dooist”). By
            using Dooist, you agree to the practices described here.
          </p>
        </header>

        <div className="mt-7 rounded-xl border border-line bg-canvas p-5">
          <h2 className="text-base font-bold text-text">The short version</h2>
          <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-6 text-text marker:text-subtle">
            <li>We collect what Dooist needs to work: your account details, todos and settings.</li>
            <li>We do not sell your information, show ads, or use analytics or ad trackers.</li>
            <li>Connecting Google Calendar is optional, and you can disconnect it at any time.</li>
            <li>Your sticky notes stay on your phone and are never uploaded to our servers.</li>
            <li>You can delete your account and its data from inside the app at any time.</li>
          </ul>
        </div>

        <details className="mt-5 rounded-xl border border-line lg:hidden">
          <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-ink">
            On this page
          </summary>
          <nav aria-label="On this page" className="px-2 pb-3">
            <Contents />
          </nav>
        </details>

        <Section id="who-we-are">
          <p>
            Dooist is a todo and planning app. In this policy, “Dooist”, “we”, “us” and “our” refer
            to the operator of Dooist, and “you” refers to anyone who uses it. For any privacy
            question or request, contact us at <Email />.
          </p>
        </Section>

        <Section id="information-we-collect">
          <Subheading>Account information</Subheading>
          <Bullets>
            <li>Your email address and the name you enter.</li>
            <li>
              Your password, if you sign up with email. It is stored only in hashed form by our
              authentication provider, so we cannot read it.
            </li>
            <li>
              If you continue with Google: your name, email address, profile picture and the
              account identifier Google provides.
            </li>
          </Bullets>

          <Subheading>Your todos</Subheading>
          <p>
            Everything you put in a todo is saved to your account so it can sync across your
            devices: its title, description, due date and time, reminder time, duration and
            priority, whether it is done, and when it was created, changed, completed or deleted.
          </p>

          <Subheading>Your settings</Subheading>
          <p>
            Your appearance choice (light, dark or system), todo view and haptic feedback choice
            are saved to your account so they follow you across devices.
          </p>

          <Subheading>Google Calendar information</Subheading>
          <p>
            If you choose to connect Google Calendar, we handle the information described in{" "}
            <a href="#google" className={LINK}>
              section 6
            </a>
            .
          </p>

          <Subheading>Technical information</Subheading>
          <p>
            When you use Dooist, the services that run it process technical details such as your
            IP address, device or browser type, request times and error logs. This is needed to
            deliver the service, keep it secure and fix problems. When the Android app checks for
            updates, it sends technical details such as the app version, platform and a random
            installation identifier to Expo, our app update provider.
          </p>

          <Subheading>Messages you send us</Subheading>
          <p>If you email us, we receive your email address and whatever you include.</p>

          <Subheading>What we do not collect</Subheading>
          <p>
            Dooist does not access your contacts, location, photos, camera, microphone or device
            files, and it does not collect payment information.
          </p>
        </Section>

        <Section id="on-your-device">
          <Subheading>On the Android app</Subheading>
          <Bullets>
            <li>A copy of your todos and settings, so the app works offline.</li>
            <li>Your sticky notes, which are stored only on your phone and are never uploaded.</li>
            <li>Your scheduled reminders.</li>
            <li>
              Your Google Calendar events, if you turn on “Show calendar events in Dooist”.
            </li>
          </Bullets>
          <p>
            Logging out does not erase what is stored on that phone. To remove it, uninstall the
            app or clear its storage. Because sticky notes exist only on your phone, uninstalling
            the app or clearing its storage permanently deletes them.
          </p>

          <Subheading>On the web</Subheading>
          <p>
            We use essential cookies to keep you signed in. Your browser’s local storage holds your
            display preferences, such as theme, side menu and view, plus your notification
            settings and which notifications you have read. We do not use advertising or analytics
            cookies, so there is nothing to opt out of. If you block essential cookies, you will
            not be able to sign in.
          </p>
        </Section>

        <Section id="how-we-use">
          <p>We use your information to:</p>
          <Bullets>
            <li>create and manage your account and sign you in;</li>
            <li>save your todos and settings and sync them across your devices;</li>
            <li>show your reminders, notifications, activity history and upcoming todos;</li>
            <li>send essential account emails, such as sign-up confirmation and password reset;</li>
            <li>provide the Google Calendar features you choose to turn on;</li>
            <li>keep Dooist secure, prevent misuse, and diagnose and fix problems;</li>
            <li>respond to your requests and meet our legal obligations.</li>
          </Bullets>
          <p>
            We process your information to provide the service you asked for, with your consent for
            optional features such as Google Calendar and notifications, to keep Dooist secure, and
            where the law requires it.
          </p>
          <p>
            We do not sell your information, use it for advertising, or build advertising profiles.
            We do not share your todos with ChatGPT or any other AI service, and we do not use them
            to train AI models. “Connect ChatGPT” is shown in the app as a future feature and does
            not send any data today. If we add it, it will be optional and we will update this
            policy first.
          </p>
        </Section>

        <Section id="notifications">
          <p>
            On Android, Dooist asks for permission before showing reminders, and reminders are
            scheduled on your phone. On the web, Dooist can show browser notifications only if you
            allow them, and only while Dooist is open in a browser tab. You can choose which kinds
            you receive in Settings, and you can turn notifications off at any time in your device
            or browser settings.
          </p>
        </Section>

        <Section id="google">
          <Subheading>Continue with Google</Subheading>
          <p>
            If you sign in with Google, we receive your name, email address, profile picture and
            account identifier to create and identify your Dooist account. Your profile picture is
            loaded from Google when it is displayed.
          </p>

          <Subheading>Permissions for Google Calendar</Subheading>
          <p>Connecting Google Calendar is optional. If you connect it, Dooist asks for:</p>
          <Bullets>
            <li>
              <strong className="font-semibold">Your email address</strong>, to show which Google
              account is connected.
            </li>
            <li>
              <strong className="font-semibold">Permission to create and manage its own calendar</strong>
              , named “Dooist”. This permission does not let Dooist see or change your other
              calendars.
            </li>
            <li>
              <strong className="font-semibold">Read-only access to your calendar events</strong>,
              requested only if you turn on “Show calendar events in Dooist”.
            </li>
          </Bullets>

          <Subheading>How we use Google data</Subheading>
          <Bullets>
            <li>
              <strong className="font-semibold">Sending todos.</strong> With Todo sync on, we write
              each todo’s title, description, date, time, duration and completion status to the
              Dooist calendar. Changes made in Google Calendar do not come back to Dooist.
            </li>
            <li>
              <strong className="font-semibold">Showing events.</strong> With events turned on, we
              read the title, location and times of events in your primary calendar, from about 7
              days ago to 90 days ahead, and show them in the app. They are saved on your phone and
              are not stored in our database.
            </li>
            <li>
              <strong className="font-semibold">What we store.</strong> Our servers keep your Google
              access and refresh tokens, connected Google email, Dooist calendar ID, time zone,
              Calendar settings and sync status. The tokens are kept on the server and are never
              made available to the app.
            </li>
          </Bullets>

          <Subheading>Limited Use</Subheading>
          <p>
            Dooist’s use and transfer to any other app of information received from Google APIs will
            adhere to the{" "}
            <External href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </External>
            , including the Limited Use requirements. We use Google user data only to provide the
            features you can see in Dooist. We do not sell it, use it for advertising, or use it to
            train AI or machine learning models. People do not read it unless you ask us to, it is
            needed for security or abuse investigation, or the law requires it.
          </p>

          <Subheading>Stopping access</Subheading>
          <p>
            You can disconnect in Dooist under Calendar, using the ⋮ menu. This stops syncing, asks
            Google to revoke Dooist’s access, and deletes your Google tokens from our servers. The
            Dooist calendar and its events stay in your Google account until you delete them there.
            You can also remove Dooist’s access from your{" "}
            <External href="https://myaccount.google.com/permissions">
              Google Account permissions
            </External>
            .
          </p>
        </Section>

        <Section id="sharing">
          <p>
            We do not sell or rent your information. We share it only as needed with the following:
          </p>
          <Bullets>
            <li>
              <strong className="font-semibold">Supabase</strong>, which provides our authentication,
              database and server functions.
            </li>
            <li>
              <strong className="font-semibold">Google</strong>, if you use Google sign-in or connect
              Google Calendar.
            </li>
            <li>
              <strong className="font-semibold">Expo</strong>, which delivers updates to the Android
              app.
            </li>
            <li>
              <strong className="font-semibold">Hosting and email providers</strong>, which serve
              our website and web app and deliver essential account emails.
            </li>
            <li>
              <strong className="font-semibold">Legal and safety recipients</strong>, when required
              by law or needed to protect the rights, safety or security of our users, Dooist or
              others.
            </li>
            <li>
              <strong className="font-semibold">A successor</strong>, if Dooist is reorganized, sold
              or transferred. This policy would continue to apply to your information until you are
              told otherwise.
            </li>
          </Bullets>
          <p>
            Google, Expo and app stores also handle information under their own privacy policies.
          </p>
        </Section>

        <Section id="international">
          <p>
            Our service providers may store or process your information on servers outside India or
            outside the country where you live. Where the law requires, we take appropriate steps
            to protect your information when it is transferred.
          </p>
        </Section>

        <Section id="retention">
          <Bullets>
            <li>
              <strong className="font-semibold">Account, todos and settings:</strong> until you
              delete your account.
            </li>
            <li>
              <strong className="font-semibold">Deleted todos:</strong> a deleted todo disappears
              from your apps, and its Google Calendar event is removed at the next sync if Todo sync
              is on. We keep a record of it, marked as deleted, so your devices stay in step and
              your activity history stays accurate. That record is erased when you delete your
              account.
            </li>
            <li>
              <strong className="font-semibold">Google tokens:</strong> until you disconnect Google
              Calendar or delete your account.
            </li>
            <li>
              <strong className="font-semibold">Google connection details:</strong> after you
              disconnect, we keep your connected Google email, Dooist calendar ID and time zone so
              that reconnecting can reuse the same calendar. They are erased when you delete your
              account, or sooner if you ask us.
            </li>
            <li>
              <strong className="font-semibold">Technical logs:</strong> for a limited period set by
              our service providers.
            </li>
            <li>
              <strong className="font-semibold">Emails with us:</strong> for as long as needed to
              help you and keep a record of the request.
            </li>
          </Bullets>
          <p>
            When you delete your account, your account, todos, settings and Google connection are
            removed from our active systems. Copies may remain in routine service-provider backups
            for a limited time until they are overwritten. We may keep information for longer only
            where the law requires it.
          </p>
        </Section>

        <Section id="security">
          <p>
            We use encrypted connections between your device and our services, store passwords only
            in hashed form, restrict each account’s database access to its own data, and keep Google
            tokens on the server.
          </p>
          <p>
            No online service can guarantee complete security. Your todos are not end-to-end
            encrypted, so please avoid storing highly sensitive information in them, such as
            passwords or financial or medical details. If a data breach affects you, we will notify
            you and the relevant authorities as the law requires.
          </p>
        </Section>

        <Section id="your-rights">
          <p>Depending on where you live, including under India’s Digital Personal Data Protection Act, 2023, you may have the right to:</p>
          <Bullets>
            <li>access your personal information and ask for a copy;</li>
            <li>correct or update information that is inaccurate;</li>
            <li>have your information erased;</li>
            <li>withdraw consent for optional processing at any time;</li>
            <li>object to or restrict certain processing;</li>
            <li>nominate someone to exercise your rights if you die or become unable to;</li>
            <li>raise a grievance with us and receive a response.</li>
          </Bullets>

          <Subheading>How to use them</Subheading>
          <Bullets>
            <li>
              <strong className="font-semibold">Edit:</strong> change your name, password, todos and
              settings directly in the app.
            </li>
            <li>
              <strong className="font-semibold">Delete your account on Android:</strong> open
              Profile, then Account, then Delete account.
            </li>
            <li>
              <strong className="font-semibold">Delete your account on the web:</strong> open your
              account menu, then Profile, then Delete account.
            </li>
            <li>
              <strong className="font-semibold">Without the app:</strong> email <Email /> from your
              account’s email address and ask us to delete it.
            </li>
            <li>
              <strong className="font-semibold">Anything else:</strong> email <Email />. We may need
              to verify your identity before acting on a request.
            </li>
          </Bullets>
          <p>
            Withdrawing consent or deleting information may stop some features from working. If you
            are not satisfied with our response, you can complain to the Data Protection Board of
            India or to the data protection authority where you live.
          </p>
        </Section>

        <Section id="children">
          <p>
            Dooist is not directed to children under 18, and we do not knowingly collect their
            personal information. If you believe a child has given us personal information, contact
            us at <Email /> and we will delete it.
          </p>
        </Section>

        <Section id="changes">
          <p>
            We may update this policy as Dooist changes. We will revise the “Last updated” date
            above, and if a change is significant, we will give notice in the app or by email before
            it takes effect.
          </p>
        </Section>

        <Section id="contact">
          <p>
            For privacy questions, data requests or grievances, email <Email />. Our website is{" "}
            {SITE.domain}.
          </p>
        </Section>
      </article>
    </div>
  );
}
