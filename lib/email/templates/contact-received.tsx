import {
  Body, Container, Head, Heading, Hr, Html, Preview, Text,
} from '@react-email/components'
import { render } from '@react-email/components'

interface ContactReceivedProps {
  firstName: string
}

function ContactReceivedEmail({ firstName }: ContactReceivedProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanks for reaching out to Clout — we&apos;ll be in touch.</Preview>
      <Body style={{ backgroundColor: '#fafafa', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e4e4e7' }}>
          <Heading style={{ color: '#18181b', fontSize: '24px', fontWeight: '600', margin: '0 0 8px' }}>
            Thanks, {firstName} — we got your message.
          </Heading>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            We&apos;ve received your note and a member of the Clout team will get back to you shortly.
          </Text>
          <Text style={{ color: '#52525b', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }}>
            In the meantime, feel free to reply directly to this email if there&apos;s anything you&apos;d like to add.
          </Text>
          <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 24px' }} />
          <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>
            You&apos;re receiving this because you contacted Clout via clout.you/contact.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderHtml(props: ContactReceivedProps): Promise<string> {
  return render(<ContactReceivedEmail {...props} />)
}

export function renderText({ firstName }: ContactReceivedProps): string {
  return `Thanks, ${firstName} — we got your message.

We've received your note and a member of the Clout team will get back to you shortly.

In the meantime, feel free to reply directly to this email if there's anything you'd like to add.
`
}
